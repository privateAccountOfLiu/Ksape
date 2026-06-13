const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'webroot');
fs.mkdirSync(outDir, { recursive: true });

// Bundle JS: single file, only kernelsu imported, IIFE format, NO tree-shaking
esbuild.buildSync({
  entryPoints: [path.join(root, 'src', 'js', 'app.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2018',
  treeShaking: false,
  minify: false,
  sourcemap: true,
  outfile: path.join(outDir, 'bundle.js'),
});

const jsSize = (fs.statSync(path.join(outDir, 'bundle.js')).size / 1024).toFixed(1);
const mapSize = (fs.statSync(path.join(outDir, 'bundle.js.map')).size / 1024).toFixed(1);
console.log('JS: bundle.js (' + jsSize + ' KB) + bundle.js.map (' + mapSize + ' KB)');

// Bundle CSS inline
const cssFiles = ['reset.css', 'variables.css', 'layout.css', 'components.css', 'utilities.css'];
let css = '';
for (const f of cssFiles) {
  const fp = path.join(root, 'src', 'css', f);
  if (fs.existsSync(fp)) css += fs.readFileSync(fp, 'utf-8') + '\n';
}

// Build HTML
const html = '<!DOCTYPE html>\n<html lang="zh" data-theme="dark">\n<head>\n' +
  '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no,viewport-fit=cover">\n' +
  '<meta name="color-scheme" content="dark">\n<title>Ksape</title>\n' +
  '<style>\n' + css + '\n</style>\n</head>\n<body>\n' +
  '<header id="toolbar">\n' +
  '  <span style="font-weight:700;font-size:15px;margin-right:auto;letter-spacing:-.02em">Ksape</span>\n' +
  '  <input id="search-in" placeholder="Filter...">\n' +
  '  <button class="btn btn-icon" onclick="window._ksRefresh()" title="Refresh">\n' +
  '    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0012 4C7.58 4 4.01 7.58 4.01 12s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>\n' +
  '  </button>\n' +
  '  <button class="btn btn-icon" id="btn-sysinfo" title="System Info">\n' +
  '    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"/></svg>\n' +
  '  </button>\n' +
  '  <button class="btn btn-icon" id="btn-settings" title="Settings">\n' +
  '    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.484.484 0 0013.96 3h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-2 0-3.6-1.6-3.6-3.6s1.6-3.6 3.6-3.6 3.6 1.6 3.6 3.6-1.6 3.6-3.6 3.6z"/></svg>\n' +
  '  </button>\n' +
  '</header>\n' +
  '<div id="main">\n' +
  '  <div id="panel-l">\n' +
  '    <div id="perf-dash"></div>\n' +
  '    <div class="ph"><span>Processes</span><span style="margin-left:auto;font-size:10px" id="proc-count">--</span></div>\n' +
  '    <div id="filter-r" class="h"></div>\n' +
  '    <div class="pb" id="process-list"><div class="empty"><div class="spin"></div><span>Loading...</span></div></div>\n' +
  '  </div>\n' +
  '  <div id="detail"><div class="ph">Select a process</div><div class="db" id="dbody"></div></div>\n' +
  '</div>\n' +
  '<footer id="sbar"><span class="sbar-item"><span class="sv">Ksape v0.1.0</span></span></footer>\n' +
  '<script src="bundle.js"></script>\n</body>\n</html>\n';

fs.writeFileSync(path.join(outDir, 'index.html'), html);

const htmlSize = (fs.statSync(path.join(outDir, 'index.html')).size / 1024).toFixed(1);
console.log('HTML: index.html (' + htmlSize + ' KB)');

const total = (parseFloat(jsSize) + parseFloat(mapSize) + parseFloat(htmlSize)).toFixed(0);
console.log('Total: ~' + total + ' KB');
