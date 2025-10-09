#!/usr/bin/env node
/**
 * export-data.js
 * Decode the base64 dataset into a pretty JSON file for easy editing.
 *
 * Usage:
 *   node scripts/export-data.js [optionalOutputJsonPath]
 *
 * Defaults to writing assets/data/clubs.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B64_FILE = path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');
const OUT_JSON = process.argv[2] || path.join(ROOT, 'assets', 'data', 'clubs.json');

function main(){
  if (!fs.existsSync(B64_FILE)) {
    console.error('Dataset not found:', path.relative(ROOT, B64_FILE));
    process.exit(1);
  }
  const b64 = (fs.readFileSync(B64_FILE, 'utf8') || '').trim();
  if (!b64) {
    console.error('Dataset file is empty. Nothing to export.');
    process.exit(2);
  }
  let jsonStr;
  try {
    jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) {
    console.error('Failed to decode base64:', e.message);
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.error('Decoded content is not valid JSON:', e.message);
    process.exit(2);
  }
  if (!Array.isArray(data)) {
    console.error('Expected the dataset to be an array. Aborting.');
    process.exit(2);
  }
  const dir = path.dirname(OUT_JSON);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Exported', data.length, 'clubs to', path.relative(ROOT, OUT_JSON));
}

main();
