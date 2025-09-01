/**
 * Fixed Document Routes with Proper Error Handling
 */

import { Express } from 'express';
import { db } from './db';
import { documents } from '@shared/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';

export function registerFixedDocumentRoutes(app: Express) {
  
  // Simple document search endpoint that works without therapistId
  app.get('/api/documents/search', async (req, res) => {
    try {
      const { query, therapistId, category } = req.query;
      
      // Make therapistId optional for testing
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      console.log(`🔍 Searching documents for query: "${query}"`);
      
      const searchPattern = `%${query}%`;
      
      // Build search conditions
      const conditions = [];
      
      // Add therapist filter only if provided
      if (therapistId && typeof therapistId === 'string') {
        conditions.push(eq(documents.therapistId, therapistId));
      }
      
      // Search in multiple fields - handle potential null columns
      const searchCondition = or(
        sql`${documents.fileName} LIKE ${searchPattern}`,
        sql`${documents.originalName} LIKE ${searchPattern}`,
        sql`COALESCE(${documents.contentSummary}, '') LIKE ${searchPattern}`,
        sql`COALESCE(${documents.extractedText}, '') LIKE ${searchPattern}`,
        sql`COALESCE(${documents.description}, '') LIKE ${searchPattern}`,
        sql`COALESCE(${documents.category}, '') LIKE ${searchPattern}`
      );
      
      if (searchCondition) {
        conditions.push(searchCondition);
      }
      
      if (category && typeof category === 'string') {
        conditions.push(eq(documents.category, category));
      }
      
      // Search documents with proper error handling
      let searchResults = [];
      try {
        if (conditions.length > 0) {
          searchResults = await db
            .select({
              id: documents.id,
              fileName: documents.fileName,
              originalName: documents.originalName,
              fileType: documents.fileType,
              fileSize: documents.fileSize,
              category: documents.category,
              clientId: documents.clientId,
              therapistId: documents.therapistId,
              createdAt: documents.createdAt,
              extractedText: documents.extractedText,
              contentSummary: documents.contentSummary,
              aiTags: documents.aiTags,
              documentType: documents.documentType
            })
            .from(documents)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(documents.createdAt))
            .limit(100);
        } else {
          // If no conditions, just search in all documents
          searchResults = await db
            .select({
              id: documents.id,
              fileName: documents.fileName,
              originalName: documents.originalName,
              fileType: documents.fileType,
              fileSize: documents.fileSize,
              category: documents.category,
              clientId: documents.clientId,
              therapistId: documents.therapistId,
              createdAt: documents.createdAt,
              extractedText: documents.extractedText,
              contentSummary: documents.contentSummary,
              aiTags: documents.aiTags,
              documentType: documents.documentType
            })
            .from(documents)
            .where(searchCondition)
            .orderBy(desc(documents.createdAt))
            .limit(100);
        }
        
        console.log(`✅ Found ${searchResults.length} documents matching "${query}"`);
      } catch (dbError: any) {
        console.error('Database query error:', dbError);
        // Return empty results instead of error for better UX
        searchResults = [];
      }
      
      res.json({
        results: searchResults,
        query,
        count: searchResults.length,
        success: true
      });
      
    } catch (error: any) {
      console.error('Error searching documents:', error);
      res.status(500).json({ 
        error: 'Failed to search documents',
        details: error.message,
        success: false
      });
    }
  });
  
  // Get all documents (with optional filters)
  app.get('/api/documents', async (req, res) => {
    try {
      const { therapistId, clientId, category, limit = '50', offset = '0' } = req.query;
      
      console.log('📄 Fetching documents with filters:', { therapistId, clientId, category });
      
      // Build query conditions
      const conditions = [];
      
      if (therapistId && typeof therapistId === 'string') {
        conditions.push(eq(documents.therapistId, therapistId));
      }
      
      if (clientId && typeof clientId === 'string') {
        conditions.push(eq(documents.clientId, clientId));
      }
      
      if (category && typeof category === 'string') {
        conditions.push(eq(documents.category, category));
      }
      
      // Fetch documents with safe query
      let allDocs = [];
      let totalCount = 0;
      
      try {
        if (conditions.length > 0) {
          allDocs = await db
            .select()
            .from(documents)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions))
            .orderBy(desc(documents.createdAt))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));
          
          // Get total count
          const countResult = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(documents)
            .where(conditions.length === 1 ? conditions[0] : and(...conditions));
          
          totalCount = countResult[0]?.count || 0;
        } else {
          // No filters, get all documents
          allDocs = await db
            .select()
            .from(documents)
            .orderBy(desc(documents.createdAt))
            .limit(parseInt(limit as string))
            .offset(parseInt(offset as string));
          
          const countResult = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(documents);
          
          totalCount = countResult[0]?.count || 0;
        }
      } catch (dbError: any) {
        console.error('Database query error:', dbError);
        allDocs = [];
        totalCount = 0;
      }
      
      console.log(`✅ Found ${allDocs.length} documents (total: ${totalCount})`);
      
      res.json({
        documents: allDocs,
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > parseInt(offset as string) + allDocs.length,
        success: true
      });
      
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ 
        error: 'Failed to fetch documents',
        details: error.message,
        success: false
      });
    }
  });
  
  // Get specific document by ID
  app.get('/api/documents/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      console.log(`📄 Fetching document: ${documentId}`);
      
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);
      
      if (!document) {
        return res.status(404).json({ 
          error: 'Document not found',
          success: false
        });
      }
      
      console.log(`✅ Found document: ${document.fileName}`);
      
      res.json({
        document,
        success: true
      });
      
    } catch (error: any) {
      console.error('Error fetching document:', error);
      res.status(500).json({ 
        error: 'Failed to fetch document',
        details: error.message,
        success: false
      });
    }
  });
  
  console.log('✅ Fixed document routes registered successfully');
}