#!/usr/bin/env tsx
/**
 * Script to fix document storage and retrieval issues
 * Run this to repair existing data and ensure proper document management
 */

import { config } from 'dotenv';
import { db, pool } from './server/db';
import { documents, clients, sessionNotes } from './shared/schema';
import { eq, and, or, isNull, sql } from 'drizzle-orm';
import { fixOrphanedDocuments, verifyDocumentIntegrity } from './server/document-fix';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

async function main() {
  console.log('🔧 Document Storage Fix Script');
  console.log('================================\n');
  
  try {
    // Step 1: Check database connection
    console.log('📊 Checking database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');
    
    // Step 2: Analyze current document state
    console.log('📈 Analyzing document storage state...');
    
    // Count total documents
    const [{ totalDocs }] = await db
      .select({ totalDocs: sql<number>`count(*)` })
      .from(documents);
    
    console.log(`   Total documents in database: ${totalDocs}`);
    
    // Count documents without client links
    const [{ orphanedDocs }] = await db
      .select({ orphanedDocs: sql<number>`count(*)` })
      .from(documents)
      .where(or(isNull(documents.clientId), eq(documents.clientId, '')));
    
    console.log(`   Documents without client links: ${orphanedDocs}`);
    
    // Count documents without extracted text
    const [{ noTextDocs }] = await db
      .select({ noTextDocs: sql<number>`count(*)` })
      .from(documents)
      .where(or(isNull(documents.extractedText), eq(documents.extractedText, '')));
    
    console.log(`   Documents without extracted text: ${noTextDocs}`);
    
    // Count documents without AI tags
    const [{ noTagsDocs }] = await db
      .select({ noTagsDocs: sql<number>`count(*)` })
      .from(documents)
      .where(isNull(documents.aiTags));
    
    console.log(`   Documents without AI tags: ${noTagsDocs}\n`);
    
    // Step 3: Get all therapists
    console.log('👥 Finding therapists with documents...');
    const therapists = await db
      .select({ 
        therapistId: documents.therapistId,
        docCount: sql<number>`count(*)` 
      })
      .from(documents)
      .groupBy(documents.therapistId);
    
    console.log(`   Found ${therapists.length} therapists with documents\n`);
    
    // Step 4: Fix orphaned documents for each therapist
    console.log('🔄 Fixing orphaned documents...');
    let totalFixed = 0;
    
    for (const therapist of therapists) {
      console.log(`\n   Processing therapist: ${therapist.therapistId}`);
      
      try {
        const result = await fixOrphanedDocuments(therapist.therapistId);
        totalFixed += result.fixed;
        console.log(`   ✅ Fixed ${result.fixed}/${result.orphaned} orphaned documents`);
      } catch (error) {
        console.error(`   ❌ Error processing therapist ${therapist.therapistId}:`, error);
      }
    }
    
    console.log(`\n✅ Total orphaned documents fixed: ${totalFixed}\n`);
    
    // Step 5: Create missing session notes for documents with session data
    console.log('📝 Creating missing session notes from documents...');
    
    const docsWithSessions = await db
      .select()
      .from(documents)
      .where(
        and(
          or(
            eq(documents.category, 'session_note'),
            eq(documents.category, 'progress_note'),
            eq(documents.documentType, 'session_note'),
            eq(documents.documentType, 'progress_note')
          )
        )
      );
    
    console.log(`   Found ${docsWithSessions.length} documents that might be session notes`);
    
    let sessionsCreated = 0;
    
    for (const doc of docsWithSessions) {
      if (!doc.clientId) continue;
      
      try {
        // Check if session note already exists for this document
        const existingNote = await db
          .select()
          .from(sessionNotes)
          .where(
            and(
              eq(sessionNotes.clientId, doc.clientId),
              sql`${sessionNotes.content} LIKE '%${doc.originalName}%'`
            )
          )
          .limit(1);
        
        if (existingNote.length === 0 && doc.extractedText) {
          // Extract date from document
          const dateMatch = doc.extractedText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
          const sessionDate = dateMatch ? new Date(dateMatch[0]) : doc.createdAt;
          
          // Create session note
          await db.insert(sessionNotes).values({
            clientId: doc.clientId,
            therapistId: doc.therapistId,
            sessionDate,
            content: doc.extractedText || '',
            title: `Session from ${doc.originalName}`,
            narrativeSummary: doc.contentSummary || '',
            createdAt: doc.createdAt,
            updatedAt: new Date()
          });
          
          sessionsCreated++;
          console.log(`   ✅ Created session note for ${doc.originalName}`);
        }
      } catch (error) {
        console.error(`   ❌ Error creating session note for ${doc.originalName}:`, error);
      }
    }
    
    console.log(`\n✅ Created ${sessionsCreated} new session notes from documents\n`);
    
    // Step 6: Verify integrity for each therapist
    console.log('🔍 Verifying document integrity...');
    
    for (const therapist of therapists) {
      console.log(`\n   Checking therapist: ${therapist.therapistId}`);
      
      try {
        const integrity = await verifyDocumentIntegrity(therapist.therapistId);
        console.log(`   📊 Results:`);
        console.log(`      Healthy documents: ${integrity.healthy}/${integrity.totalDocuments}`);
        
        if (integrity.issues.missingFiles.length > 0) {
          console.log(`      ⚠️  Missing files: ${integrity.issues.missingFiles.length}`);
        }
        if (integrity.issues.missingText.length > 0) {
          console.log(`      ⚠️  Missing text: ${integrity.issues.missingText.length}`);
        }
        if (integrity.issues.missingClient.length > 0) {
          console.log(`      ⚠️  Missing client: ${integrity.issues.missingClient.length}`);
        }
        if (integrity.issues.missingTags.length > 0) {
          console.log(`      ⚠️  Missing tags: ${integrity.issues.missingTags.length}`);
        }
      } catch (error) {
        console.error(`   ❌ Error checking integrity for therapist ${therapist.therapistId}:`, error);
      }
    }
    
    // Step 7: Create uploads directory if it doesn't exist
    console.log('\n📁 Ensuring upload directory exists...');
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('   ✅ Created uploads directory');
    } else {
      console.log('   ✅ Uploads directory already exists');
    }
    
    // Step 8: Final summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL SUMMARY');
    console.log('='.repeat(50));
    
    // Re-count after fixes
    const [{ finalTotalDocs }] = await db
      .select({ finalTotalDocs: sql<number>`count(*)` })
      .from(documents);
    
    const [{ finalOrphanedDocs }] = await db
      .select({ finalOrphanedDocs: sql<number>`count(*)` })
      .from(documents)
      .where(or(isNull(documents.clientId), eq(documents.clientId, '')));
    
    const [{ finalNoTextDocs }] = await db
      .select({ finalNoTextDocs: sql<number>`count(*)` })
      .from(documents)
      .where(or(isNull(documents.extractedText), eq(documents.extractedText, '')));
    
    console.log(`Total documents: ${finalTotalDocs}`);
    console.log(`Orphaned documents remaining: ${finalOrphanedDocs} (was ${orphanedDocs})`);
    console.log(`Documents without text: ${finalNoTextDocs} (was ${noTextDocs})`);
    console.log(`Documents fixed: ${totalFixed}`);
    console.log(`Session notes created: ${sessionsCreated}`);
    
    console.log('\n✅ Document fix completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Test document upload with the new endpoints');
    console.log('   2. Verify documents appear in client charts');
    console.log('   3. Test AI analysis and case conceptualization');
    console.log('   4. Monitor for any new issues');
    
  } catch (error) {
    console.error('\n❌ Error during document fix:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Run the script
main().catch(console.error);