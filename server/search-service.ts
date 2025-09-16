import { pool } from './db';
import { clients, appointments, sessionNotes, documents, aiInsights } from '@shared/schema';
// @ts-ignore - drizzle-orm types may not be fully installed
import { sql, and, or, like, gte, lte, eq, desc, asc, inArray } from 'drizzle-orm';

export interface SearchFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string[];
  tags?: string[];
  categories?: string[];
  entityTypes?: string[];
  therapistId?: string;
  clientId?: string;
  minScore?: number;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  entityTypes?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  type: 'client' | 'appointment' | 'session_note' | 'document' | 'ai_insight';
  title: string;
  subtitle?: string;
  description?: string;
  date?: Date;
  tags?: string[];
  score?: number;
  highlight?: string;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  facets?: Record<string, Record<string, number>>;
  suggestions?: string[];
  executionTime?: number;
}

export class SearchService {
  // Helper function to sanitize search query for PostgreSQL full-text search
  private sanitizeQuery(query: string): string {
    // Remove special characters that might break the query
    return query
      .replace(/[^\w\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0)
      .join(' & '); // Use AND operator for all terms
  }

  // Helper function to create fuzzy search pattern
  private createFuzzyPattern(query: string): string {
    return `%${query.toLowerCase().replace(/\s+/g, '%')}%`;
  }

  // Search clients
  async searchClients(
    query: string,
    therapistId: string,
    filters?: SearchFilters,
    limit = 10,
    offset = 0
  ): Promise<SearchResult[]> {
    const fuzzyPattern = this.createFuzzyPattern(query);
    
    const queryStr = `
      SELECT 
        id,
        first_name,
        last_name,
        email,
        phone,
        status,
        created_at,
        CASE
          WHEN LOWER(first_name || ' ' || last_name) LIKE $1 THEN 1.0
          WHEN LOWER(email) LIKE $1 THEN 0.8
          WHEN LOWER(phone) LIKE $1 THEN 0.7
          ELSE 0.5
        END as score
      FROM clients
      WHERE 
        therapist_id = $2
        AND (
          LOWER(first_name || ' ' || last_name) LIKE $1
          OR LOWER(email) LIKE $1
          OR LOWER(phone) LIKE $1
          OR LOWER(COALESCE(preferred_name, '')) LIKE $1
          OR LOWER(COALESCE(referral_source, '')) LIKE $1
        )
        ${filters?.status?.length ? `AND status = ANY($3::text[])` : ''}
      ORDER BY score DESC, created_at DESC
      LIMIT $${filters?.status?.length ? 4 : 3} OFFSET $${filters?.status?.length ? 5 : 4}
    `;

    const params: any[] = [fuzzyPattern, therapistId];
    if (filters?.status?.length) {
      params.push(filters.status);
    }
    params.push(limit, offset);

    const result = await pool.query(queryStr, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'client' as const,
      title: `${row.first_name} ${row.last_name}`,
      subtitle: row.email,
      description: `Phone: ${row.phone || 'N/A'} • Status: ${row.status}`,
      date: row.created_at,
      score: row.score,
      metadata: {
        status: row.status,
        email: row.email,
        phone: row.phone
      }
    }));
  }

  // Search appointments
  async searchAppointments(
    query: string,
    therapistId: string,
    filters?: SearchFilters,
    limit = 10,
    offset = 0
  ): Promise<SearchResult[]> {
    const fuzzyPattern = this.createFuzzyPattern(query);
    
    let queryStr = `
      SELECT 
        a.id,
        a.start_time,
        a.end_time,
        a.type,
        a.status,
        a.location,
        a.notes,
        c.first_name,
        c.last_name,
        CASE
          WHEN LOWER(a.type) LIKE $1 THEN 1.0
          WHEN LOWER(c.first_name || ' ' || c.last_name) LIKE $1 THEN 0.9
          WHEN LOWER(COALESCE(a.notes, '')) LIKE $1 THEN 0.7
          WHEN LOWER(COALESCE(a.location, '')) LIKE $1 THEN 0.6
          ELSE 0.5
        END as score
      FROM appointments a
      LEFT JOIN clients c ON a.client_id = c.id
      WHERE 
        a.therapist_id = $2
        AND (
          LOWER(a.type) LIKE $1
          OR LOWER(c.first_name || ' ' || c.last_name) LIKE $1
          OR LOWER(COALESCE(a.notes, '')) LIKE $1
          OR LOWER(COALESCE(a.location, '')) LIKE $1
        )
    `;

    const params: any[] = [fuzzyPattern, therapistId];
    let paramIndex = 3;

    if (filters?.status?.length) {
      queryStr += ` AND a.status = ANY($${paramIndex}::text[])`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters?.dateFrom) {
      queryStr += ` AND a.start_time >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters?.dateTo) {
      queryStr += ` AND a.start_time <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    queryStr += ` ORDER BY score DESC, a.start_time DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(queryStr, params);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'appointment' as const,
      title: `${row.type} with ${row.first_name} ${row.last_name}`,
      subtitle: new Date(row.start_time).toLocaleString(),
      description: `Status: ${row.status} • Location: ${row.location || 'N/A'}`,
      date: row.start_time,
      score: row.score,
      metadata: {
        status: row.status,
        type: row.type,
        clientName: `${row.first_name} ${row.last_name}`
      }
    }));
  }

  // Search session notes
  async searchSessionNotes(
    query: string,
    therapistId: string,
    filters?: SearchFilters,
    limit = 10,
    offset = 0
  ): Promise<SearchResult[]> {
    const fuzzyPattern = this.createFuzzyPattern(query);
    
    const queryStr = `
      SELECT 
        id,
        title,
        content,
        subjective,
        objective,
        assessment,
        plan,
        session_date,
        client_id,
        CASE
          WHEN LOWER(COALESCE(title, '')) LIKE $1 THEN 1.0
          WHEN LOWER(COALESCE(content, '')) LIKE $1 THEN 0.9
          WHEN LOWER(COALESCE(subjective, '')) LIKE $1 THEN 0.8
          WHEN LOWER(COALESCE(assessment, '')) LIKE $1 THEN 0.8
          WHEN LOWER(COALESCE(plan, '')) LIKE $1 THEN 0.7
          WHEN LOWER(COALESCE(objective, '')) LIKE $1 THEN 0.6
          ELSE 0.5
        END as score
      FROM session_notes
      WHERE 
        therapist_id = $2
        AND (
          LOWER(COALESCE(title, '')) LIKE $1
          OR LOWER(COALESCE(content, '')) LIKE $1
          OR LOWER(COALESCE(subjective, '')) LIKE $1
          OR LOWER(COALESCE(objective, '')) LIKE $1
          OR LOWER(COALESCE(assessment, '')) LIKE $1
          OR LOWER(COALESCE(plan, '')) LIKE $1
          OR LOWER(COALESCE(narrative_summary, '')) LIKE $1
        )
      ORDER BY score DESC, session_date DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(queryStr, [fuzzyPattern, therapistId, limit, offset]);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'session_note' as const,
      title: row.title || 'Session Note',
      subtitle: row.session_date ? new Date(row.session_date).toLocaleDateString() : undefined,
      description: this.truncateText(row.content || row.subjective || row.assessment, 150),
      date: row.session_date,
      score: row.score,
      metadata: {
        clientId: row.client_id
      }
    }));
  }

  // Search documents
  async searchDocuments(
    query: string,
    therapistId: string,
    filters?: SearchFilters,
    limit = 10,
    offset = 0
  ): Promise<SearchResult[]> {
    const fuzzyPattern = this.createFuzzyPattern(query);
    
    const queryStr = `
      SELECT 
        id,
        filename,
        description,
        category,
        uploaded_at,
        extracted_text,
        CASE
          WHEN LOWER(filename) LIKE $1 THEN 1.0
          WHEN LOWER(COALESCE(description, '')) LIKE $1 THEN 0.8
          WHEN LOWER(COALESCE(category, '')) LIKE $1 THEN 0.7
          WHEN LOWER(COALESCE(extracted_text, '')) LIKE $1 THEN 0.6
          ELSE 0.5
        END as score
      FROM documents
      WHERE 
        uploaded_by = $2
        AND (
          LOWER(filename) LIKE $1
          OR LOWER(COALESCE(description, '')) LIKE $1
          OR LOWER(COALESCE(category, '')) LIKE $1
          OR LOWER(COALESCE(extracted_text, '')) LIKE $1
        )
      ORDER BY score DESC, uploaded_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(queryStr, [fuzzyPattern, therapistId, limit, offset]);

    return result.rows.map((row: any) => ({
      id: row.id,
      type: 'document' as const,
      title: row.filename,
      subtitle: row.category,
      description: row.description || this.truncateText(row.extracted_text, 150),
      date: row.uploaded_at,
      score: row.score,
      metadata: {
        category: row.category
      }
    }));
  }

  // Global search across all entities
  async globalSearch(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, filters, limit = 20, offset = 0 } = options;
    
    // If no specific entity types specified, search all
    const entityTypes = options.entityTypes?.length 
      ? options.entityTypes 
      : ['client', 'appointment', 'session_note', 'document'];

    const results: SearchResult[] = [];
    const promises: Promise<SearchResult[]>[] = [];

    // Search each entity type in parallel
    if (entityTypes.includes('client') && filters?.therapistId) {
      promises.push(this.searchClients(query, filters.therapistId, filters, limit, offset));
    }
    if (entityTypes.includes('appointment') && filters?.therapistId) {
      promises.push(this.searchAppointments(query, filters.therapistId, filters, limit, offset));
    }
    if (entityTypes.includes('session_note') && filters?.therapistId) {
      promises.push(this.searchSessionNotes(query, filters.therapistId, filters, limit, offset));
    }
    if (entityTypes.includes('document') && filters?.therapistId) {
      promises.push(this.searchDocuments(query, filters.therapistId, filters, limit, offset));
    }

    const allResults = await Promise.all(promises);
    allResults.forEach(entityResults => results.push(...entityResults));

    // Sort by score and apply limit
    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    const paginatedResults = results.slice(0, limit);

    // Generate facets (counts by type)
    const facets = this.generateFacets(results);

    // Generate suggestions
    const suggestions = await this.generateSuggestions(query, filters?.therapistId);

    const executionTime = Date.now() - startTime;

    return {
      results: paginatedResults,
      totalCount: results.length,
      facets,
      suggestions,
      executionTime
    };
  }

  // Save search to history
  async saveSearchHistory(
    therapistId: string,
    query: string,
    entityType?: string,
    filters?: SearchFilters,
    resultCount?: number
  ): Promise<void> {
    await pool.query(
      `INSERT INTO search_history (therapist_id, query, entity_type, filters, result_count)
       VALUES ($1, $2, $3, $4, $5)`,
      [therapistId, query, entityType, filters ? JSON.stringify(filters) : null, resultCount || 0]
    );
  }

  // Get search history
  async getSearchHistory(therapistId: string, limit = 10): Promise<string[]> {
    const result = await pool.query(
      `SELECT DISTINCT query 
       FROM search_history 
       WHERE therapist_id = $1 
       ORDER BY search_timestamp DESC 
       LIMIT $2`,
      [therapistId, limit]
    );
    return result.rows.map((row: any) => row.query);
  }

  // Save a search preset
  async saveSearchPreset(
    therapistId: string,
    name: string,
    query: string,
    entityType?: string,
    filters?: SearchFilters
  ): Promise<void> {
    await pool.query(
      `INSERT INTO saved_searches (therapist_id, name, query, entity_type, filters)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (therapist_id, name) 
       DO UPDATE SET query = $3, entity_type = $4, filters = $5, updated_at = NOW()`,
      [therapistId, name, query, entityType, filters ? JSON.stringify(filters) : null]
    );
  }

  // Get saved searches
  async getSavedSearches(therapistId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM saved_searches WHERE therapist_id = $1 ORDER BY created_at DESC`,
      [therapistId]
    );
    return result.rows;
  }

  // Helper functions
  private truncateText(text: string | null, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private generateFacets(results: SearchResult[]): Record<string, Record<string, number>> {
    const facets: Record<string, Record<string, number>> = {
      type: {},
      status: {}
    };

    results.forEach(result => {
      // Count by type
      facets.type[result.type] = (facets.type[result.type] || 0) + 1;
      
      // Count by status if available
      if (result.metadata?.status) {
        facets.status[result.metadata.status] = (facets.status[result.metadata.status] || 0) + 1;
      }
    });

    return facets;
  }

  private async generateSuggestions(query: string, therapistId?: string): Promise<string[]> {
    if (!therapistId) return [];
    
    // Get recent searches similar to current query
    const result = await pool.query(
      `SELECT DISTINCT query 
       FROM search_history 
       WHERE therapist_id = $1 
         AND query ILIKE $2
         AND query != $3
       ORDER BY search_timestamp DESC 
       LIMIT 5`,
      [therapistId, `${query}%`, query]
    );
    
    return result.rows.map((row: any) => row.query);
  }
}

export const searchService = new SearchService();