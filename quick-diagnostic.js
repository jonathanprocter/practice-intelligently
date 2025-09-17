
const http = require('http');

console.log('🔍 Diagnosing server startup issues...');

// Check if server is running
function checkServer(port) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/health',
      timeout: 2000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', () => resolve({ error: true }));
    req.on('timeout', () => resolve({ timeout: true }));
    req.end();
  });
}

async function diagnose() {
  console.log('Checking port 5000...');
  const result = await checkServer(5000);
  
  if (result.error) {
    console.log('❌ Server not responding on port 5000');
    console.log('💡 Try running: npx tsx server/simple-start.ts');
  } else if (result.timeout) {
    console.log('⏰ Server timeout - may be starting up');
  } else {
    console.log('✅ Server is running!', result.data);
  }
}

diagnose();
