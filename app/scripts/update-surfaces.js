#!/usr/bin/env node
const fs = require('fs');
const p = 'assets/data/clubs.json';
if (!fs.existsSync(p)) { console.error('Missing', p); process.exit(2); }
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
let changed = 0;
for (const club of c) {
  if (/Claremont Railway Lawn Tennis Club/i.test(club.name)) {
    club.court_surface = 'Real Grass / Artificial Grass (Tiger Turf)';
    changed++;
    console.log('patched Claremont', club.id);
  }
  if (/Fitzwilliam Lawn Tennis Club/i.test(club.name)) {
    club.court_surface = 'Artificial Grass (Tiger Turf) / Artificial Clay (Red Plus) / Hard Court';
    changed++;
    console.log('patched Fitzwilliam', club.id);
  }
}
if (!changed) console.log('No matches found');
fs.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
console.log('Written', p);
