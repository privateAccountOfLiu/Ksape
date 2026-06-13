// Package: creates ZIP from webroot/ + module.prop + action.sh
// No build step needed — files served directly (like systemapp_nuker)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const version = fs.readFileSync(path.join(root, 'module.prop'), 'utf-8')
  .match(/^version=(.+)$/m)[1].trim();
const zipName = 'Ksape-' + version + '.zip';
const distDir = path.join(root, 'dist');
const pkgDir = path.join(distDir, '_package');

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(pkgDir, { recursive: true });

fs.copyFileSync(path.join(root, 'module.prop'), path.join(pkgDir, 'module.prop'));
fs.copyFileSync(path.join(root, 'action.sh'), path.join(pkgDir, 'action.sh'));
copyDir(path.join(root, 'webroot'), path.join(pkgDir, 'webroot'));

const zipPath = path.join(distDir, zipName);
createZip(pkgDir, zipPath);
fs.rmSync(pkgDir, { recursive: true });

const stat = fs.statSync(zipPath);
console.log('Packaged: dist/' + zipName + ' (' + (stat.size / 1024).toFixed(0) + ' KB)');
listZip(zipPath);

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isDirectory()) copyDir(path.join(src, entry.name), path.join(dst, entry.name));
    else fs.copyFileSync(path.join(src, entry.name), path.join(dst, entry.name));
  }
}

function createZip(dirPath, zipPath) {
  const files = [];
  walkDir(dirPath, '', files);
  const chunks = [], centralDir = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = Buffer.from(f.name, 'utf-8');
    const data = fs.readFileSync(f.path);
    const crc = crc32(data);
    const isScript = f.name.endsWith('.sh');
    const extAttrs = (isScript ? 0o100755 : 0o100644) * 65536;
    const versionMadeBy = 0x031E;

    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(localHeader, 30);

    chunks.push(localHeader);
    chunks.push(data);
    const headerSize = localHeader.length + data.length;

    const cdEntry = Buffer.alloc(46 + nameBytes.length);
    cdEntry.writeUInt32LE(0x02014b50, 0);
    cdEntry.writeUInt16LE(versionMadeBy, 4);
    cdEntry.writeUInt16LE(20, 6);
    cdEntry.writeUInt16LE(0x0800, 8);
    cdEntry.writeUInt32LE(crc, 16);
    cdEntry.writeUInt32LE(data.length, 20);
    cdEntry.writeUInt32LE(data.length, 24);
    cdEntry.writeUInt16LE(nameBytes.length, 28);
    cdEntry.writeUInt32LE(extAttrs, 38);
    cdEntry.writeUInt32LE(offset, 42);
    nameBytes.copy(cdEntry, 46);
    centralDir.push(cdEntry);
    offset += headerSize;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) { chunks.push(cd); cdSize += cd.length; }

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  chunks.push(eocd);

  fs.writeFileSync(zipPath, Buffer.concat(chunks));
}

function walkDir(dir, relPath, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = relPath ? relPath + '/' + entry.name : entry.name;
    if (entry.isDirectory()) walkDir(path.join(dir, entry.name), rel, files);
    else files.push({ name: rel, path: path.join(dir, entry.name) });
  }
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) { crc ^= data[i]; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function listZip(zipPath) {
  const data = fs.readFileSync(zipPath);
  for (let i = data.length - 22; i >= 0; i--) {
    if (data.readUInt32LE(i) === 0x06054b50) {
      const cdOffset = data.readUInt32LE(i + 16);
      let pos = cdOffset;
      while (pos < i) {
        if (data.readUInt32LE(pos) !== 0x02014b50) break;
        const nameLen = data.readUInt16LE(pos + 28);
        const extraLen = data.readUInt16LE(pos + 30);
        const commentLen = data.readUInt16LE(pos + 32);
        const compSize = data.readUInt32LE(pos + 20);
        const name = data.toString('utf-8', pos + 46, pos + 46 + nameLen);
        console.log('  ' + String(compSize).padStart(8) + '  ' + name);
        pos += 46 + nameLen + extraLen + commentLen;
      }
      return;
    }
  }
}
