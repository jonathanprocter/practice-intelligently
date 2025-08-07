import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testComprehensiveParser() {
  
  try {
    const form = new FormData();
    form.append('document', fs.createReadStream('attached_assets/8-5-2025 - Comprehensive Progress Notes _1754543943877.docx'));
    form.append('therapistId', 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');
    
    console.log('Starting comprehensive document processing...');
    
    const response = await fetch('http://localhost:5000/api/documents/parse-comprehensive-progress-notes', {
      method: 'POST',
      body: form,
      timeout: 600000 // 10 minutes
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('\n=== COMPREHENSIVE PROCESSING RESULTS ===');
    console.log(JSON.stringify(result, null, 2));
    
    // Save results to file
    fs.writeFileSync('processing_results.json', JSON.stringify(result, null, 2));
    console.log('\n✅ Results saved to processing_results.json');
    
  } catch (error) {
    console.error('❌ Error testing comprehensive parser:', error);
  }
}

testComprehensiveParser();