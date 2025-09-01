/**
 * Document Storage and Retrieval Fix
 * This module provides comprehensive fixes for document processing, storage, and retrieval
 */

import { Express } from 'express';
import { db, pool } from './db';
import { documents, sessionNotes, clients } from '@shared/schema';
import { eq, desc, and, or, like, sql, inArray } from 'drizzle-orm';
import { storage } from './storage';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { DocumentProcessor } from './documentProcessor';
import { DocumentTagger } from './documentTagger';

// Configure multer for document uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

const docProcessor = new DocumentProcessor();

/**
 * Register comprehensive document management routes
 */
export function registerDocumentRoutes(app: Express) {
  
  // ============= RETRIEVAL ENDPOINTS =============
  
  /**
   * Get all documents for a specific client
   */
  app.get('/api/documents/client/:clientId', async (req, res) => {
    try {
      const { clientId } = req.params;
      const { category, subcategory, sensitivityLevel, limit = '50', offset = '0' } = req.query;
      
      console.log(`📄 Fetching documents for client: ${clientId}`);
      
      // Build query conditions
      const conditions = [eq(documents.clientId, clientId)];
      
      if (category && typeof category === 'string') {
        conditions.push(eq(documents.category, category));
      }
      
      if (subcategory && typeof subcategory === 'string') {
        conditions.push(eq(documents.subcategory, subcategory));
      }
      
      if (sensitivityLevel && typeof sensitivityLevel === 'string') {
        conditions.push(eq(documents.sensitivityLevel, sensitivityLevel));
      }
      
      // Fetch documents
      const clientDocs = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      // Get total count for pagination
      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(and(...conditions));
      
      console.log(`✅ Found ${clientDocs.length} documents for client ${clientId}`);
      
      res.json({
        documents: clientDocs,
        totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount > parseInt(offset as string) + clientDocs.length
      });
      
    } catch (error) {
      console.error('Error fetching client documents:', error);
      res.status(500).json({ 
        error: 'Failed to fetch client documents',
        details: error.message 
      });
    }
  });
  
  /**
   * Get all documents for a therapist
   */
  app.get('/api/documents/therapist/:therapistId', async (req, res) => {
    try {
      const { therapistId } = req.params;
      const { category, clientId, limit = '50', offset = '0' } = req.query;
      
      // Build query conditions
      const conditions = [eq(documents.therapistId, therapistId)];
      
      if (category && typeof category === 'string') {
        conditions.push(eq(documents.category, category));
      }
      
      if (clientId && typeof clientId === 'string') {
        conditions.push(eq(documents.clientId, clientId));
      }
      
      // Fetch documents
      const therapistDocs = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
      
      res.json({
        documents: therapistDocs,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });
      
    } catch (error) {
      console.error('Error fetching therapist documents:', error);
      res.status(500).json({ 
        error: 'Failed to fetch therapist documents',
        details: error.message 
      });
    }
  });
  
  /**
   * Get a specific document by ID
   */
  app.get('/api/documents/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const [document] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Update last accessed timestamp
      await db
        .update(documents)
        .set({ lastAccessedAt: new Date() })
        .where(eq(documents.id, documentId));
      
      res.json(document);
      
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ 
        error: 'Failed to fetch document',
        details: error.message 
      });
    }
  });
  
  /**
   * Search documents across all clients for a therapist
   */
  app.get('/api/documents/search', async (req, res) => {
    try {
      const { therapistId, query, category } = req.query;
      
      if (!therapistId || typeof therapistId !== 'string') {
        return res.status(400).json({ error: 'Therapist ID is required' });
      }
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }
      
      const searchPattern = `%${query}%`;
      
      // Build search conditions
      const conditions = [
        eq(documents.therapistId, therapistId),
        or(
          like(documents.fileName, searchPattern),
          like(documents.originalName, searchPattern),
          like(documents.contentSummary, searchPattern),
          like(documents.extractedText, searchPattern),
          like(documents.description, searchPattern)
        )
      ];
      
      if (category && typeof category === 'string') {
        conditions.push(eq(documents.category, category));
      }
      
      // Search documents
      const searchResults = await db
        .select()
        .from(documents)
        .where(and(...conditions))
        .orderBy(desc(documents.createdAt))
        .limit(100);
      
      res.json({
        results: searchResults,
        query,
        count: searchResults.length
      });
      
    } catch (error) {
      console.error('Error searching documents:', error);
      res.status(500).json({ 
        error: 'Failed to search documents',
        details: error.message 
      });
    }
  });
  
  // ============= UPLOAD & PROCESSING ENDPOINTS =============
  
  /**
   * Enhanced document upload with proper client linking
   */
  app.post('/api/documents/upload', upload.single('document'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const { clientId, therapistId, description, documentType } = req.body;
      
      if (!therapistId) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Therapist ID is required' });
      }
      
      console.log(`📤 Processing document upload: ${req.file.originalname}`);
      console.log(`   Client ID: ${clientId || 'Not specified'}`);
      console.log(`   Therapist ID: ${therapistId}`);
      
      // Process the document to extract text
      const processed = await docProcessor.processDocument(req.file.path, req.file.originalname);
      
      // Perform AI analysis for tagging
      let taggingResult = null;
      try {
        taggingResult = await DocumentTagger.analyzeDocument(
          req.file.path,
          req.file.originalname,
          path.extname(req.file.originalname)
        );
      } catch (tagError) {
        console.warn('AI tagging failed, continuing without tags:', tagError);
      }
      
      // Determine client ID if not provided
      let finalClientId = clientId;
      
      if (!finalClientId && processed.detectedClientName) {
        // Try to match client by name
        const clientName = processed.detectedClientName;
        const nameParts = clientName.split(' ');
        
        if (nameParts.length >= 2) {
          const [firstName, ...lastNameParts] = nameParts;
          const lastName = lastNameParts.join(' ');
          
          const [matchedClient] = await db
            .select()
            .from(clients)
            .where(
              and(
                eq(clients.therapistId, therapistId),
                or(
                  and(
                    like(clients.firstName, `%${firstName}%`),
                    like(clients.lastName, `%${lastName}%`)
                  ),
                  like(clients.preferredName, `%${clientName}%`)
                )
              )
            )
            .limit(1);
          
          if (matchedClient) {
            finalClientId = matchedClient.id;
            console.log(`✅ Auto-matched client: ${matchedClient.firstName} ${matchedClient.lastName}`);
          }
        }
      }
      
      // Create document record in database
      const documentRecord = await storage.createDocument({
        clientId: finalClientId,
        therapistId,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: documentType || taggingResult?.category || 'general',
        description: description || taggingResult?.contentSummary || '',
        filePath: req.file.path,
        isConfidential: taggingResult?.sensitivityLevel === 'high' || taggingResult?.sensitivityLevel === 'confidential',
        tags: {},
        
        // AI analysis results
        aiTags: taggingResult?.aiTags || [],
        category: taggingResult?.category || documentType || 'general',
        subcategory: taggingResult?.subcategory || null,
        contentSummary: taggingResult?.contentSummary || processed.extractedText?.substring(0, 500) || '',
        clinicalKeywords: taggingResult?.clinicalKeywords || [],
        confidenceScore: String(taggingResult?.confidenceScore || 0),
        sensitivityLevel: taggingResult?.sensitivityLevel || 'standard',
        extractedText: processed.extractedText || ''
      });
      
      console.log(`✅ Document stored: ${documentRecord.id}`);
      console.log(`   Linked to client: ${finalClientId || 'None'}`);
      
      // If document contains session information, create session note
      if (processed.detectedSessionDate && finalClientId) {
        try {
          const sessionNote = await storage.createSessionNote({
            clientId: finalClientId,
            therapistId,
            sessionDate: new Date(processed.detectedSessionDate),
            content: processed.extractedText || '',
            title: `Session from ${req.file.originalname}`,
            documentId: documentRecord.id,
            createdAt: new Date()
          });
          
          console.log(`📝 Created linked session note: ${sessionNote.id}`);
        } catch (sessionError) {
          console.warn('Failed to create session note:', sessionError);
        }
      }
      
      res.json({
        success: true,
        document: documentRecord,
        processed: {
          extractedText: processed.extractedText?.substring(0, 1000), // First 1000 chars for preview
          detectedClientName: processed.detectedClientName,
          detectedSessionDate: processed.detectedSessionDate,
          clientMatched: !!finalClientId
        },
        aiAnalysis: taggingResult
      });
      
    } catch (error) {
      // Clean up file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error processing document upload:', error);
      res.status(500).json({ 
        error: 'Failed to process document',
        details: error.message 
      });
    }
  });
  
  /**
   * Bulk document processing for existing files
   */
  app.post('/api/documents/bulk-process', async (req, res) => {
    try {
      const { therapistId } = req.body;
      
      if (!therapistId) {
        return res.status(400).json({ error: 'Therapist ID is required' });
      }
      
      // Get all documents without extracted text or AI tags
      const unprocessedDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.therapistId, therapistId),
            or(
              eq(documents.extractedText, ''),
              eq(documents.extractedText, null),
              eq(documents.aiTags, null)
            )
          )
        );
      
      console.log(`🔄 Found ${unprocessedDocs.length} documents to process`);
      
      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };
      
      for (const doc of unprocessedDocs) {
        try {
          if (fs.existsSync(doc.filePath)) {
            // Extract text if missing
            if (!doc.extractedText) {
              const processed = await docProcessor.processDocument(doc.filePath, doc.originalName);
              await db
                .update(documents)
                .set({ extractedText: processed.extractedText })
                .where(eq(documents.id, doc.id));
            }
            
            // Perform AI analysis if missing
            if (!doc.aiTags) {
              const taggingResult = await DocumentTagger.analyzeDocument(
                doc.filePath,
                doc.originalName,
                path.extname(doc.originalName)
              );
              
              await storage.updateDocumentWithTags(doc.id, {
                aiTags: taggingResult.aiTags,
                category: taggingResult.category,
                subcategory: taggingResult.subcategory,
                contentSummary: taggingResult.contentSummary,
                clinicalKeywords: taggingResult.clinicalKeywords,
                confidenceScore: taggingResult.confidenceScore,
                sensitivityLevel: taggingResult.sensitivityLevel
              });
            }
            
            results.processed++;
          } else {
            results.failed++;
            results.errors.push(`File not found: ${doc.originalName}`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`Failed to process ${doc.originalName}: ${error.message}`);
        }
      }
      
      res.json({
        success: true,
        message: `Bulk processing complete`,
        results
      });
      
    } catch (error) {
      console.error('Error in bulk processing:', error);
      res.status(500).json({ 
        error: 'Failed to bulk process documents',
        details: error.message 
      });
    }
  });
  
  // ============= UPDATE & DELETE ENDPOINTS =============
  
  /**
   * Update document metadata
   */
  app.patch('/api/documents/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      const updateData = req.body;
      
      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.filePath;
      
      const updatedDoc = await storage.updateDocument(documentId, {
        ...updateData,
        updatedAt: new Date()
      });
      
      res.json(updatedDoc);
      
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ 
        error: 'Failed to update document',
        details: error.message 
      });
    }
  });
  
  /**
   * Delete a document
   */
  app.delete('/api/documents/:documentId', async (req, res) => {
    try {
      const { documentId } = req.params;
      
      // Get document to delete file
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId));
      
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Delete physical file if it exists
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
      
      // Delete database record
      await storage.deleteDocument(documentId);
      
      res.json({ success: true, message: 'Document deleted successfully' });
      
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ 
        error: 'Failed to delete document',
        details: error.message 
      });
    }
  });
  
  // ============= ANALYTICS ENDPOINTS =============
  
  /**
   * Get document statistics for a therapist
   */
  app.get('/api/documents/stats/:therapistId', async (req, res) => {
    try {
      const { therapistId } = req.params;
      
      const stats = await storage.getDocumentTagStatistics(therapistId);
      
      // Get recent uploads
      const recentUploads = await db
        .select()
        .from(documents)
        .where(eq(documents.therapistId, therapistId))
        .orderBy(desc(documents.createdAt))
        .limit(10);
      
      res.json({
        ...stats,
        recentUploads
      });
      
    } catch (error) {
      console.error('Error fetching document stats:', error);
      res.status(500).json({ 
        error: 'Failed to fetch document statistics',
        details: error.message 
      });
    }
  });
}

/**
 * Fix orphaned documents (documents without client links)
 */
export async function fixOrphanedDocuments(therapistId: string) {
  try {
    console.log('🔧 Fixing orphaned documents...');
    
    // Find documents without client IDs
    const orphanedDocs = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.therapistId, therapistId),
          or(
            eq(documents.clientId, null),
            eq(documents.clientId, '')
          )
        )
      );
    
    console.log(`Found ${orphanedDocs.length} orphaned documents`);
    
    let fixed = 0;
    
    for (const doc of orphanedDocs) {
      try {
        // Try to extract client name from document
        if (doc.extractedText) {
          const clientNameMatch = doc.extractedText.match(/(?:client|patient|name):\s*([A-Za-z]+\s+[A-Za-z]+)/i);
          
          if (clientNameMatch) {
            const clientName = clientNameMatch[1];
            const nameParts = clientName.split(' ');
            
            if (nameParts.length >= 2) {
              const [firstName, ...lastNameParts] = nameParts;
              const lastName = lastNameParts.join(' ');
              
              // Try to find matching client
              const [matchedClient] = await db
                .select()
                .from(clients)
                .where(
                  and(
                    eq(clients.therapistId, therapistId),
                    like(clients.firstName, `%${firstName}%`),
                    like(clients.lastName, `%${lastName}%`)
                  )
                )
                .limit(1);
              
              if (matchedClient) {
                await db
                  .update(documents)
                  .set({ clientId: matchedClient.id })
                  .where(eq(documents.id, doc.id));
                
                console.log(`✅ Linked document ${doc.originalName} to client ${matchedClient.firstName} ${matchedClient.lastName}`);
                fixed++;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Failed to fix document ${doc.id}:`, error);
      }
    }
    
    console.log(`✅ Fixed ${fixed} orphaned documents`);
    return { orphaned: orphanedDocs.length, fixed };
    
  } catch (error) {
    console.error('Error fixing orphaned documents:', error);
    throw error;
  }
}

/**
 * Verify document storage integrity
 */
export async function verifyDocumentIntegrity(therapistId: string) {
  try {
    console.log('🔍 Verifying document integrity...');
    
    const allDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.therapistId, therapistId));
    
    const issues = {
      missingFiles: [],
      missingText: [],
      missingClient: [],
      missingTags: []
    };
    
    for (const doc of allDocs) {
      // Check if file exists
      if (!fs.existsSync(doc.filePath)) {
        issues.missingFiles.push(doc.id);
      }
      
      // Check if text was extracted
      if (!doc.extractedText || doc.extractedText.length === 0) {
        issues.missingText.push(doc.id);
      }
      
      // Check if client is linked
      if (!doc.clientId) {
        issues.missingClient.push(doc.id);
      }
      
      // Check if AI tags exist
      if (!doc.aiTags || (Array.isArray(doc.aiTags) && doc.aiTags.length === 0)) {
        issues.missingTags.push(doc.id);
      }
    }
    
    console.log('📊 Integrity check results:');
    console.log(`   Total documents: ${allDocs.length}`);
    console.log(`   Missing files: ${issues.missingFiles.length}`);
    console.log(`   Missing text: ${issues.missingText.length}`);
    console.log(`   Missing client: ${issues.missingClient.length}`);
    console.log(`   Missing tags: ${issues.missingTags.length}`);
    
    return {
      totalDocuments: allDocs.length,
      issues,
      healthy: allDocs.length - Math.max(
        issues.missingFiles.length,
        issues.missingText.length,
        issues.missingClient.length,
        issues.missingTags.length
      )
    };
    
  } catch (error) {
    console.error('Error verifying document integrity:', error);
    throw error;
  }
}