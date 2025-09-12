
#!/usr/bin/env node

console.log('🔍 Verifying Deployment Configuration...\n');

// Check environment variables
const requiredEnvVars = {
  'NODE_ENV': process.env.NODE_ENV,
  'NPM_CONFIG_CACHE': process.env.NPM_CONFIG_CACHE,
  'NODE_OPTIONS': process.env.NODE_OPTIONS
};

console.log('Environment Variables:');
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  console.log(`  ${status} ${key}: ${value || 'not set'}`);
});

// Check Node.js version
console.log('\nNode.js Version:');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 18) {
  console.log(`  ✅ Node.js ${nodeVersion} (compatible)`);
} else {
  console.log(`  ❌ Node.js ${nodeVersion} (requires 18+)`);
}

// Check cartographer plugin configuration
console.log('\nCartographer Plugin Status:');
if (process.env.NODE_ENV === 'production') {
  console.log('  ✅ Cartographer plugin disabled (NODE_ENV=production)');
} else {
  console.log('  ⚠️  Cartographer plugin may load (NODE_ENV not production)');
}

// Check package cache configuration
console.log('\nPackage Cache Configuration:');
if (process.env.NPM_CONFIG_CACHE === '/tmp/.npm-cache') {
  console.log('  ✅ Using ephemeral cache directory');
} else {
  console.log('  ⚠️  Not using recommended cache directory');
}

// Check memory allocation
console.log('\nMemory Configuration:');
if (process.env.NODE_OPTIONS?.includes('--max-old-space-size')) {
  console.log('  ✅ Memory optimization enabled');
} else {
  console.log('  ⚠️  Memory optimization not configured');
}

// Check for critical files
const fs = require('fs');
const criticalFiles = [
  'server/index.ts',
  'server/routes.ts',
  'vite.config.ts',
  'package.json',
  '.replit'
];

console.log('\nCritical Files:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
});

console.log('\n🎯 Deployment verification complete!');
