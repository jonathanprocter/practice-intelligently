import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

// Test the comprehensive document parsing with file upload
async function testDocumentProcessing() {
  try {
    const filePath = './test-sarah-document.txt';
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error('Test file does not exist:', filePath);
      return;
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    form.append('therapistId', 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');

    console.log('📄 Uploading and processing document...');
    
    const response = await fetch('http://localhost:5000/api/documents/parse-comprehensive-progress-notes', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    const result = await response.json();
    console.log('📊 Processing result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Document processed successfully!');
      console.log(`📝 Created ${result.createdProgressNotes} session notes`);
      console.log(`👥 Matched ${result.successfulMatches} clients`);
    } else {
      console.log('❌ Document processing failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDocumentProcessing();