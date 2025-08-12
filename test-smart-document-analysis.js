import FormData from 'form-data';
import fs from 'fs';

async function testSmartDocumentAnalysis() {
  console.log('🧪 Testing Smart Document Analysis API...\n');

  // Test 1: Get available categories
  console.log('1. Testing Categories API...');
  try {
    const categoriesResponse = await fetch('http://localhost:5000/api/documents/categories');
    const categoriesData = await categoriesResponse.json();
    
    if (categoriesData.success) {
      console.log('✅ Categories API working');
      console.log(`📊 Found ${categoriesData.categories.length} document categories:`);
      categoriesData.categories.forEach(cat => {
        console.log(`   - ${cat.category}: ${cat.subcategories.length} subcategories (${cat.defaultSensitivity} sensitivity)`);
      });
    }
  } catch (error) {
    console.error('❌ Categories API failed:', error.message);
  }

  // Test 2: Create a sample document for analysis
  console.log('\n2. Creating test clinical document...');
  const testDocument = `
Clinical Progress Note - SOAP Format

Date: August 12, 2025
Client: Test Client
Therapist: Dr. Jonathan Procter

SUBJECTIVE:
Client reports feeling anxious about upcoming work presentation. Sleep has been disrupted (4-5 hours per night). 
Client mentions continued use of deep breathing techniques learned in previous sessions. Reports some improvement 
in managing panic symptoms using the 4-4-4 breathing method introduced last week.

OBJECTIVE:
Client appeared alert and engaged during session. No visible signs of acute distress. Speech pattern normal, 
good eye contact maintained throughout session. Client demonstrated proper 4-4-4 breathing technique when prompted.

ASSESSMENT:
Client continues to show progress with anxiety management techniques. GAD symptoms appear to be responding well 
to CBT interventions. Client demonstrates good understanding of breathing exercises and reports practical 
application between sessions.

PLAN:
1. Continue practicing 4-4-4 breathing technique daily
2. Introduce progressive muscle relaxation next session
3. Schedule follow-up in one week
4. Client to keep anxiety journal noting triggers and responses
5. Consider referring for sleep hygiene consultation if sleep issues persist

Next appointment: August 19, 2025
Diagnosis: Generalized Anxiety Disorder (F41.1)
`;

  // Write test document to file
  fs.writeFileSync('test-clinical-note.txt', testDocument);

  // Test 3: Analyze the document
  console.log('3. Testing Smart Document Analysis...');
  try {
    const formData = new FormData();
    formData.append('document', fs.createReadStream('test-clinical-note.txt'), {
      filename: 'test-clinical-note.txt',
      contentType: 'text/plain'
    });
    formData.append('therapistId', 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');

    const response = await fetch('http://localhost:5000/api/documents/analyze-and-tag', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Document Analysis Successful!');
      console.log('\n📋 Analysis Results:');
      console.log(`   Category: ${result.analysis.category}`);
      console.log(`   Subcategory: ${result.analysis.subcategory}`);
      console.log(`   Confidence: ${Math.round(result.analysis.confidenceScore * 100)}%`);
      console.log(`   Sensitivity: ${result.analysis.sensitivityLevel}`);
      
      console.log('\n🏷️  AI-Generated Tags:');
      result.analysis.aiTags.forEach(tag => {
        console.log(`   - ${tag.tag} (${Math.round(tag.confidence * 100)}% ${tag.type})`);
      });

      console.log('\n📖 Content Summary:');
      console.log(`   ${result.analysis.contentSummary}`);

      if (result.analysis.clinicalKeywords.length > 0) {
        console.log('\n🔍 Clinical Keywords:');
        console.log(`   ${result.analysis.clinicalKeywords.join(', ')}`);
      }

      console.log(`\n💾 Document stored with ID: ${result.document.id}`);
    } else {
      console.error('❌ Analysis failed:', result.error);
    }

  } catch (error) {
    console.error('❌ Analysis API failed:', error.message);
  }

  // Test 4: Get document statistics
  console.log('\n4. Testing Document Statistics...');
  try {
    const statsResponse = await fetch('http://localhost:5000/api/documents/statistics/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');
    const statsData = await statsResponse.json();
    
    if (statsData.success) {
      console.log('✅ Statistics API working');
      console.log(`📊 Total documents: ${statsData.statistics.totalDocuments}`);
      console.log('   Categories:', statsData.statistics.categoryCounts);
      console.log('   Sensitivity levels:', statsData.statistics.sensitivityCounts);
    }
  } catch (error) {
    console.error('❌ Statistics API failed:', error.message);
  }

  // Clean up
  console.log('\n🧹 Cleaning up test file...');
  try {
    fs.unlinkSync('test-clinical-note.txt');
    console.log('✅ Test file cleaned up');
  } catch (error) {
    console.log('⚠️  Could not clean up test file');
  }

  console.log('\n🎉 Smart Document Analysis Test Complete!');
}

// Run the test
testSmartDocumentAnalysis().catch(console.error);