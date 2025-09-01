// Polyfill for import.meta.dirname in Node.js 18
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Add dirname property to import.meta if it doesn't exist
if (typeof import.meta.dirname === 'undefined') {
  Object.defineProperty(import.meta, 'dirname', {
    get() {
      return dirname(fileURLToPath(import.meta.url));
    },
    configurable: true
  });
}