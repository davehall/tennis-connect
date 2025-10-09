#!/usr/bin/env node
const fs = require('fs');
const p = 'assets/data/clubs.json';
if (!fs.existsSync(p)) { console.error('Missing', p); process.exit(2); }
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
let found = false;
for (const club of c) {
  if (/Elm Park Golf & Sports Club/i.test(club.name)) {
    club.lat = 53.313897;
    club.lng = -6.217228;
    console.log('patched', club.name, club.id);
    found = true;
  }
}
if (!found) console.log('Elm Park not found');
fs.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
console.log('Updated', p);
