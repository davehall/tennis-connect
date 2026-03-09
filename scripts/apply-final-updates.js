#!/usr/bin/env node
const fs = require('fs');
const p = 'assets/data/clubs.json';
if (!fs.existsSync(p)) { console.error('Missing', p); process.exit(2); }
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
function setByName(name, fn){ const re = new RegExp(name,'i'); for (const club of c) { if (re.test(club.name)) { fn(club); console.log('patched', club.name, club.id); } } }

setByName("Sunday's Well", cl => { cl.courts = 8; cl.court_surface = 'Artificial Grass (Tiger Turf)'; });
setByName('Naas Lawn Tennis Club', cl => { cl.courts = 13; });
setByName('Elm Park Golf & Sports Club', cl => { cl.lat = 53.314857; cl.lng = -6.219439; });
setByName('David Lloyd Dublin Riverview', cl => { if (cl.court_surface) {
  cl.court_surface = cl.court_surface.split('/').map(s=>s.trim()).filter(x=>!/artificial\s*clay/i.test(x)).join(' / ');
}});
setByName('Cavehill Tennis Club', cl => { cl.court_surface = 'Hard Court'; });

fs.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
console.log('Final updates written to', p);
