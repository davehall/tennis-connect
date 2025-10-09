#!/usr/bin/env node
const fs = require('fs');
const p = 'assets/data/clubs.json';
if (!fs.existsSync(p)) { console.error('Missing', p); process.exit(2); }
const c = JSON.parse(fs.readFileSync(p, 'utf8'));
function setByName(re, fn){for(const club of c){if(re.test(club.name)){fn(club);console.log('patched',club.name,club.id);}}}

setByName(/Grove Lawn Tennis Club/i, cl=>{cl.courts=4;});
setByName(/Claremont Railway Lawn Tennis Club/i, cl=>{cl.indoor=false; cl.court_surface='Artificial Grass (Tiger Turf)';});
setByName(/Ballycastle Tennis Club/i, cl=>{cl.courts=11;});
setByName(/Argideen Vale Lawn Tennis & Croquet Club/i, cl=>{cl.lat=51.658042; cl.lng=-8.764723;});

fs.writeFileSync(p, JSON.stringify(c, null, 2), 'utf8');
console.log('Written', p);
