#!/usr/bin/env node

/**
 * Process Large Clinical Documents for Multiple Caitlin Sessions
 * 
 * This script will process the large clinical progress note documents
 * to extract all of Caitlin's sessions that may not have been processed yet.
 */

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const API_BASE = 'http://localhost:5000';

const largeDocuments = [
    'attached_assets/8-5-2025 - Comprehensive Progress Notes _1754543943877.docx',
    'attached_assets/_SimplePractice-Comprehensive Clinical Progress Notes - 6-2-2025_1754546095382.docx',
    'attached_assets/7-20-2025-Clinical_Progress_Notes_Final_1754546212157.docx'
];

console.log('🔍 PROCESSING LARGE CLINICAL DOCUMENTS FOR CAITLIN SESSIONS');
console.log('========================================================\n');

async function processDocument(filePath) {
    console.log(`📄 Processing: ${path.basename(filePath)}`);
    
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`   ❌ File not found: ${filePath}`);
            return;
        }
        
        const stats = fs.statSync(filePath);
        console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
        
        // Extract text from document
        const buffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer });
        const content = result.value;
        
        console.log(`   📝 Extracted ${content.length} characters`);
        
        // Look for Caitlin mentions
        const caitlinMatches = content.match(/Caitlin/gi) || [];
        console.log(`   👤 Found ${caitlinMatches.length} mentions of "Caitlin"`);
        
        if (caitlinMatches.length > 0) {
            console.log('   🎯 This document contains Caitlin sessions!');
            
            // Send to document processor
            const formData = new FormData();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            formData.append('files', blob, path.basename(filePath));
            
            console.log('   🤖 Sending to intelligent document processor...');
            
            const response = await fetch(`${API_BASE}/api/documents/process`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(`   ✅ Processing completed successfully`);
                console.log(`   📊 Results: ${JSON.stringify(result, null, 2)}`);
            } else {
                console.log(`   ❌ Processing failed: ${response.statusText}`);
            }
        }
        
    } catch (error) {
        console.log(`   ❌ Error processing document: ${error.message}`);
    }
    
    console.log('');
}

// Process each document
for (const docPath of largeDocuments) {
    await processDocument(docPath);
}

console.log('🎉 DOCUMENT PROCESSING COMPLETED');
console.log('Check the session notes for newly processed Caitlin sessions.');