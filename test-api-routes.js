#!/usr/bin/env node

// Test script to verify API routes are returning JSON
import http from 'http';

const PORT = process.env.PORT || 5000;

function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n📍 Testing ${description} (${path})`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Content-Type: ${res.headers['content-type']}`);
        
        try {
          const json = JSON.parse(data);
          console.log(`   ✅ Valid JSON response:`, JSON.stringify(json, null, 2).substring(0, 200));
        } catch (e) {
          if (data.includes('<!DOCTYPE') || data.includes('<html')) {
            console.log(`   ❌ ERROR: Returned HTML instead of JSON!`);
            console.log(`   First 100 chars:`, data.substring(0, 100));
          } else {
            console.log(`   ❌ ERROR: Invalid response:`, data.substring(0, 100));
          }
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.log(`\n📍 Testing ${description} (${path})`);
      console.log(`   ❌ ERROR: ${error.message}`);
      resolve();
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting API Route Tests...');
  console.log(`   Server URL: http://localhost:${PORT}`);
  console.log('   Waiting 2 seconds for server to be ready...\n');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test all endpoints
  await testEndpoint('/health', 'Health Check (root)');
  await testEndpoint('/api/health', 'Health Check (API)');
  await testEndpoint('/api/documents/1', 'Get Document');
  await testEndpoint('/api/therapists/test-id/clients', 'Get Therapist Clients');
  
  console.log('\n✨ Tests Complete!');
}

// Run tests
runTests();