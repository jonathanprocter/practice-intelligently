#!/usr/bin/env node

// Test login script to debug authentication
const fetch = require('node-fetch');

async function testLogin() {
  const url = 'http://localhost:3000/api/auth/login';
  const credentials = {
    username: 'admin',
    password: 'admin123'
  };

  console.log('Testing login with:', credentials);
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.raw());
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      console.log('✅ Login successful!');
      const data = JSON.parse(text);
      console.log('Token:', data.token);
      console.log('User:', data.user);
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testLogin();