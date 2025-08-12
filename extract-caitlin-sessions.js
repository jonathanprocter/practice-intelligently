#!/usr/bin/env node

/**
 * Extract and Process All Caitlin Sessions from Large Document
 */

const fs = require('fs');
const mammoth = require('mammoth');

async function processCaitlinDocument() {
    try {
        console.log('🔍 Processing Caitlin document with 73 mentions...');
        
        const buffer = fs.readFileSync('attached_assets/_SimplePractice-Comprehensive Clinical Progress Notes - 6-2-2025_1754546095382.docx');
        const result = await mammoth.extractRawText({ buffer });
        const content = result.value;
        
        console.log(`📝 Extracted ${content.length} characters`);
        
        // Send as form data to the document processor
        const formData = new FormData();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        formData.append('files', blob, '_SimplePractice-Comprehensive Clinical Progress Notes - 6-2-2025.docx');
        
        console.log('🤖 Sending to document processor API...');
        
        const response = await fetch('http://localhost:5000/api/documents/process', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Processing successful!');
            console.log('📊 Results:', JSON.stringify(result, null, 2));
        } else {
            const error = await response.text();
            console.log('❌ Processing failed:', error);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run if we're in a browser-like environment
if (typeof fetch !== 'undefined' && typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
    processCaitlinDocument();
} else {
    console.log('This needs to be run in a browser environment or with proper polyfills');
}