#!/usr/bin/env node
/*
  audit-logos.js
  Simple data hygiene script: verifies each club's favicon/logo path exists and reports:
   - Missing files (referenced but not found)
   - Unused files (present on disk but not referenced)

  Usage:
    node scripts/audit-logos.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CLUBS_FILE = path.join(ROOT, 'clubs.js');
const B64_FILE = path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');
const LOGO_DIR = path.join(ROOT, 'images', 'logos');

function decodeFromB64File(b64Path){
  try{
    if(!fs.existsSync(b64Path)) return null;
    const b64 = fs.readFileSync(b64Path,'utf8').trim();
    if(!b64) return null;
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : null;
  }catch(e){ return null; }
}

function extractFromClubsFile(jsSource){
  try {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(jsSource, context, { timeout: 2000 });
    if(Array.isArray(context.window.__ALL_CLUBS_JSON__)) return context.window.__ALL_CLUBS_JSON__;
    if(Array.isArray(context.window.allClubs)) return context.window.allClubs; // fallback
  } catch(e){
    console.error('Execution error parsing clubs.js:', e.message);
  }
  return [];
}

function main(){
  // Prefer new base64 dataset if present
  let clubs = decodeFromB64File(B64_FILE);
  if(!clubs){
    if(!fs.existsSync(CLUBS_FILE)){
      console.error('Dataset not found. Ensure assets/data/rk7a9nq3.b64.txt exists.');
      process.exit(1);
    }
    const src = fs.readFileSync(CLUBS_FILE, 'utf8');
    clubs = extractFromClubsFile(src);
  }
  if(!clubs.length){
    console.warn('No clubs parsed. Aborting.');
    process.exit(1);
  }
  const referenced = new Set();
  clubs.forEach(c => {
    const p = (c.favicon_url || c.favicon || c.icon || c.logo || '').toString().trim();
    if(!p) return;
    if(p.startsWith('http://') || p.startsWith('https://')) return; // external not expected
    referenced.add(p.replace(/^\//,''));
  });
  const missing = [];
  referenced.forEach(rel => {
    const abs = path.join(ROOT, rel);
    if(!fs.existsSync(abs)) missing.push(rel);
  });
  // Collect existing logo files
  let existing = [];
  if(fs.existsSync(LOGO_DIR)){
    existing = fs.readdirSync(LOGO_DIR).filter(f => !f.startsWith('.')).map(f => 'images/logos/' + f);
  }
  const unused = existing.filter(f => !referenced.has(f));

  console.log('\nLogo Audit Report');
  console.log('=================');
  console.log('Total clubs parsed:', clubs.length);
  console.log('Referenced local logo paths:', referenced.size);
  console.log('Missing files:', missing.length);
  missing.forEach(f => console.log('  MISSING  -', f));
  console.log('Unused files (present but not referenced):', unused.length);
  unused.forEach(f => console.log('  UNUSED   -', f));
  console.log('\nDone.');
}

main();
