const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Update openai to latest version that supports zod v4
pkg.dependencies["openai"] = "^4.67.0";
pkg.dependencies["zod"] = "^3.23.8";  // Downgrade zod to be compatible

// Or keep zod v4 and update openai
// pkg.dependencies["openai"] = "^4.73.0";  // Latest version may have better zod v4 support

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Updated package versions');
