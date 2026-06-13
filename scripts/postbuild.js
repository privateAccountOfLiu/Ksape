// Post-build: replace type=module with regular script for WebView file:// compatibility
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'webroot', 'index.html');
if (!fs.existsSync(htmlPath)) {
  console.log('webroot/index.html not found, skipping postbuild');
  process.exit(0);
}

let html = fs.readFileSync(htmlPath, 'utf-8');

// Remove type=module from script tags (the bundled JS is plain IIFE, no ES imports)
html = html.replace(/<script type=module /g, '<script ');

fs.writeFileSync(htmlPath, html);
console.log('Postbuild: removed type=module from script tags');
