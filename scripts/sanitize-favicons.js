#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_JSON = path.resolve(__dirname, '../assets/data/clubs.json');
const LOGOS_DIR = path.resolve(__dirname, '../images/logos');

function normalize(u) {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (/^([a-z]+:)?\/\//i.test(s)) return s; // full URL
  if (s.startsWith('/')) return s;
  return '/' + s.replace(/^\/+/, '');
}

function findLocalById(id) {
  // Look for any file in images/logos that ends with -<id>.<ext>
  try {
    const files = fs.readdirSync(LOGOS_DIR);
    for (const f of files) {
      if (f.match(new RegExp(`-${id}\\.`))) {
        return '/images/logos/' + f;
      }
    }
  } catch (e) {}
  return '';
}

function main() {
  if (!fs.existsSync(DATA_JSON)) {
    console.error('Missing', DATA_JSON);
    process.exit(2);
  }
  const raw = fs.readFileSync(DATA_JSON, 'utf8');
  let clubs;
  try { clubs = JSON.parse(raw); } catch (e) { console.error('Invalid JSON', e); process.exit(2); }

  const updated = clubs.map(club => {
    const c = Object.assign({}, club);
    // Candidate fields that may reference local assets
    const candidates = [c.favicon, c.favicon_url, c.icon, c.logo].map(String).map(x=>x && x.trim ? x.trim() : '').filter(Boolean);
    // Normalize any candidate that points to images/ or logos/
    let chosen = '';
    for (const cand of candidates) {
      if (/^\/?(images|logos)\//i.test(cand)) {
        const norm = normalize(cand);
        // ensure file exists
        const filePath = path.resolve(__dirname, '..', norm.replace(/^\//,''));
        if (fs.existsSync(filePath)) { chosen = norm; break; }
      }
    }
    // If none found, attempt by id pattern
    if (!chosen && c.id) {
      const found = findLocalById(c.id);
      if (found) chosen = found;
    }
    // If chosen is a local path, set it as favicon and remove external favicon fields
    if (chosen && chosen.startsWith('/images/')) {
      c.favicon = chosen;
      // clear other remote favicon fields that might confuse consumers
      if (c.favicon_url && !String(c.favicon_url).startsWith('/')) delete c.favicon_url;
      if (c.icon && !String(c.icon).startsWith('/')) delete c.icon;
      if (c.logo && !String(c.logo).startsWith('/')) delete c.logo;
    }
    return c;
  });

  // Backup existing JSON
  const bak = DATA_JSON + '.backup-' + (new Date()).toISOString().replace(/[:.]/g,'-');
  fs.copyFileSync(DATA_JSON, bak);
  fs.writeFileSync(DATA_JSON, JSON.stringify(updated, null, 2), 'utf8');
  console.log('Sanitized favicons. Wrote', DATA_JSON, 'backup at', bak);
  console.log('You can now run `npm run data:import` to re-encode the base64 payload and create its backup.');
}

if (require.main === module) main();
