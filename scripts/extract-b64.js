// Node script to extract the dataset array from clubs.js and write base64 JSON
// Usage: node scripts/extract-b64.js [outputPath]
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
// Prefer the canonical JSON dataset; fall back to legacy clubs.js if present.
const clubsJsonPath = path.join(ROOT, 'assets', 'data', 'clubs.json');
const clubsJsPath = path.join(ROOT, 'clubs.js');
const outPath = process.argv[2] || path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');

function main(){
  let arr = null;

  // First try to load from JSON, which is now the canonical source of truth.
  if (fs.existsSync(clubsJsonPath)) {
    try {
      const jsonText = fs.readFileSync(clubsJsonPath, 'utf8');
      const parsed = JSON.parse(jsonText);
      if (Array.isArray(parsed)) {
        arr = parsed;
      } else if (parsed && Array.isArray(parsed.clubs)) {
        arr = parsed.clubs;
      }
    } catch (e) {
      console.error('Failed to parse clubs.json, falling back to clubs.js if available:', e.message);
    }
  }

  // Fallback to executing legacy clubs.js if JSON path didn't yield an array.
  if (!Array.isArray(arr) && fs.existsSync(clubsJsPath)) {
    const code = fs.readFileSync(clubsJsPath, 'utf8');
    const sandbox = { window: {}, console };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox, { filename: 'clubs.js' });
    arr = Array.isArray(sandbox.window.__ALL_CLUBS_JSON__)
      ? sandbox.window.__ALL_CLUBS_JSON__
      : (Array.isArray(sandbox.window.allClubs) ? sandbox.window.allClubs : null);
  }

  if(!Array.isArray(arr)){
    console.error('Extraction failed: dataset not found as array in clubs.json or clubs.js');
    process.exit(2);
  }
  const json = JSON.stringify(arr);
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  fs.writeFileSync(outPath, b64, 'utf8');
  console.log('Wrote base64 dataset:', outPath, 'length', b64.length, 'bytes', Buffer.byteLength(b64, 'utf8'));
}

main();
