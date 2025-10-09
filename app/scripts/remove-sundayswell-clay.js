#!/usr/bin/env node
const fs = require('fs');
const p = 'assets/data/clubs.json';
if (!fs.existsSync(p)) { console.error('Missing', p); process.exit(2); }
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
let found = false;
for (const club of c) {
  if (/Sunday's Well Boating & Tennis Club/i.test(club.name)) {
    found = true;
    if (club.court_surface) {
      club.court_surface = club.court_surface.split('/').map(s => s.trim()).filter(x => !/artificial\s*clay/i.test(x)).join(' / ');
    }
    console.log('updated', club.name, club.court_surface);
  }
}
if (!found) console.log('Sunday\'s Well not found');
fs.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
console.log('Written', p);
