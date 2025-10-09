// Node script to extract the dataset array from clubs.js and write base64 JSON
// Usage: node scripts/extract-b64.js [outputPath]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const clubsPath = path.join(ROOT, 'clubs.js');
const outPath = process.argv[2] || path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');

function main(){
  const code = fs.readFileSync(clubsPath, 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'clubs.js' });
  const arr = Array.isArray(sandbox.window.__ALL_CLUBS_JSON__)
    ? sandbox.window.__ALL_CLUBS_JSON__
    : (Array.isArray(sandbox.window.allClubs) ? sandbox.window.allClubs : null);
  if(!Array.isArray(arr)){
    console.error('Extraction failed: dataset not found as array');
    process.exit(2);
  }
  const json = JSON.stringify(arr);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  fs.writeFileSync(outPath, b64, 'utf8');
  console.log('Wrote base64 dataset:', outPath, 'length', b64.length, 'bytes', Buffer.byteLength(b64, 'utf8'));
}

main();
