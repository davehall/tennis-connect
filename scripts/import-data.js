#!/usr/bin/env node
/**
 * import-data.js
 * Encode a pretty JSON dataset (array of clubs) back into base64 file used by the app.
 * Automatically creates a timestamped backup of the previous base64 file.
 *
 * Usage:
 *   node scripts/import-data.js [optionalInputJsonPath]
 *
 * Defaults to reading assets/data/clubs.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IN_JSON = process.argv[2] || path.join(ROOT, 'assets', 'data', 'clubs.json');
const B64_FILE = path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');

function ts(){
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join('') + '-' + [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('');
}

function main(){
  if (!fs.existsSync(IN_JSON)) {
    console.error('Input JSON not found:', path.relative(ROOT, IN_JSON));
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(IN_JSON, 'utf8'));
  } catch (e) {
    console.error('Failed to parse input JSON:', e.message);
    process.exit(2);
  }
  if (!Array.isArray(data)) {
    console.error('Expected top-level array in JSON. Aborting.');
    process.exit(2);
  }
  // Basic sanity pass: ensure objects have ids
  const bad = data.filter(c => !c || typeof c !== 'object' || typeof c.id === 'undefined');
  if (bad.length) {
    console.warn('Warning: some entries missing id:', bad.length);
  }
  const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  // Backup existing file
  if (fs.existsSync(B64_FILE)) {
    const backup = B64_FILE.replace(/\.b64\.txt$/, `.backup-${ts()}.b64.txt`);
    fs.copyFileSync(B64_FILE, backup);
    console.log('Backed up previous dataset to', path.relative(ROOT, backup));
  } else {
    fs.mkdirSync(path.dirname(B64_FILE), { recursive: true });
  }
  fs.writeFileSync(B64_FILE, b64 + '\n', 'utf8');
  console.log('Wrote base64 dataset to', path.relative(ROOT, B64_FILE));
  console.log('Clubs count:', data.length);
}

main();
