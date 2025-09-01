const fs = require('fs');
const path = require('path');

// Read the CSS file
const cssPath = path.join(__dirname, '../client/src/index.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Map of @apply replacements
const replacements = [
  {
    from: '@apply h-1.5 rounded-full transition-all duration-300;',
    to: 'height: 0.375rem; border-radius: 9999px; transition: all 300ms;'
  },
  {
    from: '@apply border-b transition-colors;',
    to: 'border-bottom-width: 1px; transition-property: color, background-color, border-color;'
  },
  {
    from: '@apply bg-red-100 border-red-200;',
    to: 'background-color: rgb(254 226 226); border-color: rgb(254 202 202);'
  },
  {
    from: '@apply text-xs p-1 mb-1 rounded border-l-4 bg-white shadow-sm cursor-pointer transition-all duration-200;',
    to: 'font-size: 0.75rem; padding: 0.25rem; margin-bottom: 0.25rem; border-radius: 0.25rem; border-left-width: 4px; background-color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: all 200ms;'
  },
  {
    from: '@apply shadow-md;',
    to: 'box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);'
  },
  {
    from: '@apply border-l-gray-400 bg-gray-100;',
    to: 'border-left-color: rgb(156 163 175); background-color: rgb(243 244 246);'
  },
  {
    from: '@apply p-3 text-center cursor-pointer transition-colors;',
    to: 'padding: 0.75rem; text-align: center; cursor: pointer; transition-property: color, background-color, border-color;'
  }
];

// Apply all replacements
replacements.forEach(({ from, to }) => {
  css = css.replace(from, to);
});

// Write the fixed CSS back
fs.writeFileSync(cssPath, css);

console.log('✅ Fixed all @apply directives in index.css');