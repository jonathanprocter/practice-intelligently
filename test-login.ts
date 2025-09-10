#!/usr/bin/env tsx

// Test the login functionality with admin credentials

async function testLogin() {
  const loginData = {
    username: 'admin',
    password: 'admin123'
  };

  try {
    console.log('Testing login with:', loginData.username);
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('\n✅ Login successful!');
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.token) {
        console.log('\n✅ JWT Token received:', data.token.substring(0, 50) + '...');
      }
      
      if (data.therapistId) {
        console.log('✅ Therapist ID:', data.therapistId);
      }
      
      if (data.user) {
        console.log('✅ User data:', JSON.stringify(data.user, null, 2));
      }
    } else {
      console.error('\n❌ Login failed');
      console.error('Response:', responseText);
    }
  } catch (error) {
    console.error('❌ Error testing login:', error);
  }
}

// Run the test
testLogin();