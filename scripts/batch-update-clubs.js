#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_JSON = path.resolve(__dirname, '../assets/data/clubs.json');

if (!fs.existsSync(DATA_JSON)) {
  console.error('Missing', DATA_JSON);
  process.exit(2);
}

const raw = fs.readFileSync(DATA_JSON, 'utf8');
let clubs = JSON.parse(raw);

const updates = [
  { match: /sundays well/i, set: { courts: 8, court_surface: 'Artificial Grass (Tiger Turf)' } , removeContains: ['Clay','Clay'] },
  { match: /naas tennis/i, set: { courts: 13 } },
  { match: /lansdowne tennis club/i, set: { courts: 11, court_surface: 'Artificial Grass' }, removeContains: ['Artificial Clay','Artifical clay','Artificial clay','Artifical Clay'] },
  { match: /greystones lawn tennis club/i, set: { courts: 12, court_surface: (c)=> { const cs = c && c.court_surface ? c.court_surface : ''; return cs.includes('Hard') ? cs : (cs ? cs + ' / Hard Court' : 'Hard Court'); } } },
  { match: /fitzwilliam lawn tennis club/i, set: { court_surface: 'Artificial Grass (Tiger Turf)' } },
  { match: /enniskillen lawn tennis club/i, set: { court_surface: 'Artificial Grass' } },
  { match: /elmpark/i, set: { lat: 53.314857, lng: -6.219439 } },
  { match: /dundalk tennis club/i, set: { courts: 9 } },
  { match: /david lloyd dublin riverview/i, set: { court_surface_removeContains: ['Artificial Clay','Artficial clay','Artificial clay'] } },
  { match: /cavehill tennis club/i, set: { court_surface: 'Hard Court' } }
];

function removeSurfaceContains(value, substrings) {
  if (!value) return '';
  let v = value.toString();
  for (const sub of substrings) {
    const re = new RegExp(sub, 'i');
    v = v.replace(re, '').replace(/\s*\/\s*$/, '').trim();
  }
  // Clean up extra slashes and whitespace
  v = v.replace(/\s*\/\s*/g, ' / ').replace(/\s{2,}/g,' ').trim();
  if (!v) return '';
  return v;
}

let changed = 0;
for (const u of updates) {
  for (let i=0;i<clubs.length;i++) {
    const club = clubs[i];
    if (u.match.test(club.name)) {
      const before = Object.assign({}, club);
      if (u.set) {
        for (const [k,v] of Object.entries(u.set)) {
          if (typeof v === 'function') {
            club[k] = v(club);
          } else {
            club[k] = v;
          }
        }
      }
      if (u.set && u.set.court_surface && typeof u.set.court_surface === 'string') {
        // ensure value isn't empty
        club.court_surface = u.set.court_surface;
      }
      if (u.removeContains && club.court_surface) {
        club.court_surface = removeSurfaceContains(club.court_surface, u.removeContains);
      }
      if (u.set && u.set.court_surface_removeContains) {
        club.court_surface = removeSurfaceContains(club.court_surface, u.set.court_surface_removeContains);
      }
      clubs[i] = club;
      changed++;
      console.log('Updated', club.name, '(', club.id, ')');
    }
  }
}

if (changed === 0) console.log('No matching clubs found for updates.');

const bak = DATA_JSON + '.backup-' + (new Date()).toISOString().replace(/[:.]/g,'-');
fs.copyFileSync(DATA_JSON, bak);
fs.writeFileSync(DATA_JSON, JSON.stringify(clubs, null, 2), 'utf8');
console.log('Wrote updated', DATA_JSON, 'backup ->', bak);
console.log('Run `npm run data:import` to re-encode the base64 payload.');
