#!/usr/bin/env node
/*
  move-unused-logos.js
  Moves logo files in images/logos/ that are not referenced by:
   - clubs.js (favicon_url/favicon/icon/logo fields)
   - index.html (any occurrences of images/logos/...)
   - search.html (any occurrences of images/logos/...)
  into images/unused-logos/.

  Usage:
    node scripts/move-unused-logos.js
*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CLUBS_FILE = path.join(ROOT, 'clubs.js');
const B64_FILE = path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');
const INDEX_HTML = path.join(ROOT, 'index.html');
const SEARCH_HTML = path.join(ROOT, 'search.html');
const LOGO_DIR = path.join(ROOT, 'images', 'logos');
const UNUSED_DIR = path.join(ROOT, 'images', 'unused-logos');

function decodeFromB64File(b64Path){
  try{
    if(!fs.existsSync(b64Path)) return null;
    const b64 = fs.readFileSync(b64Path,'utf8').trim();
    if(!b64) return null;
    const json = Buffer.from(b64,'base64').toString('utf8');
    const arr = JSON.parse(json);
    return Array.isArray(arr)? arr : null;
  }catch(e){ return null; }
}

function extractClubs(jsSource){
  try{
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(jsSource, context, { timeout: 2000 });
    if(Array.isArray(context.window.__ALL_CLUBS_JSON__)) return context.window.__ALL_CLUBS_JSON__;
    if(Array.isArray(context.window.allClubs)) return context.window.allClubs;
  }catch(e){ /* ignore */ }
  return [];
}

function refsFromHtml(html){
  const re = /images\/logos\/[^"'\s)]+/g;
  const out = new Set();
  let m;
  while((m = re.exec(html))){ out.add(m[0]); }
  return out;
}

function main(){
  if(!fs.existsSync(LOGO_DIR)){
    console.error('Missing directory:', LOGO_DIR);
    process.exit(1);
  }
  const referenced = new Set();
  // Dataset references (prefer base64 file)
  let clubs = decodeFromB64File(B64_FILE);
  if(!clubs){
    if(fs.existsSync(CLUBS_FILE)){
      const src = fs.readFileSync(CLUBS_FILE,'utf8');
      clubs = extractClubs(src);
    } else {
      clubs = [];
    }
  }
  if(Array.isArray(clubs) && clubs.length){
    clubs.forEach(c => {
      const p = (c.favicon_url || c.favicon || c.icon || c.logo || '').toString().trim();
      if(!p) return; if(/^https?:\/\//i.test(p)) return;
      referenced.add(p.replace(/^\//,''));
    });
  }
  // HTML references (index + search)
  [INDEX_HTML, SEARCH_HTML].forEach(f => {
    if(fs.existsSync(f)){
      const html = fs.readFileSync(f,'utf8');
      refsFromHtml(html).forEach(p => referenced.add(p));
    }
  });
  // Collect current logo files (non-recursive)
  const entries = fs.readdirSync(LOGO_DIR, { withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.'))
    .map(d => d.name);

  // Determine unused
  const unused = entries.filter(name => !referenced.has('images/logos/' + name));
  if(!unused.length){
    console.log('No unused logos found.');
    return;
  }
  // Ensure destination exists
  fs.mkdirSync(UNUSED_DIR, { recursive: true });

  let moved = 0;
  unused.forEach(name => {
    const from = path.join(LOGO_DIR, name);
    const to = path.join(UNUSED_DIR, name);
    try{
      fs.renameSync(from, to);
      moved++;
      console.log('Moved:', name);
    }catch(e){
      console.error('Failed to move', name, '-', e.message);
    }
  });

  console.log(`\nDone. Moved ${moved} files to ${path.relative(ROOT, UNUSED_DIR)}`);
}

main();
