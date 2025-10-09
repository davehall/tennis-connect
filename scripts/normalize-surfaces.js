#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_JSON = path.join(__dirname, '../app/assets/data/clubs.json');
const BACKUP = path.join(__dirname, '../app/assets/data/clubs.json.backup-' + new Date().toISOString().replace(/[:.]/g,'') + '.json');

const CANONICAL = [
  'Artificial Grass',
  'Artificial Grass (Savannah)',
  'Artificial Grass (TigerTurf)',
  'Natural Grass',
  'Artificial Clay (Red Plus)',
  'Artificial Clay',
  'Natural Clay',
  'Hard Court'
];

function normalizePart(s) {
  if (!s) return null;
  const seg = s.toString().trim();
  const sLow = seg.toLowerCase();
  if (sLow.includes('savannah')) return 'Artificial Grass (Savannah)';
  if (sLow.includes('tigerturf') || sLow.includes('tiger')) return 'Artificial Grass (TigerTurf)';
  if (sLow.includes('artificial grass') || sLow.includes('synthetic grass') || sLow.includes('astroturf') || sLow.includes('astro')) return 'Artificial Grass';
  if (sLow.includes('natural') && sLow.includes('grass')) return 'Natural Grass';
  if (sLow === 'grass' || (sLow.includes('grass') && !sLow.includes('artificial') && !sLow.includes('synthetic'))) return 'Natural Grass';
  if (sLow.includes('hardcourt') || sLow.includes('hard court') || sLow.includes('acrylic') || sLow.includes('poraflex') || sLow.includes('polymeric')) return 'Hard Court';
  if (sLow.includes('redplus') || sLow.includes('red plus') || sLow.includes('red+')) return 'Artificial Clay (Red Plus)';
  if (sLow.includes('advantage red') || sLow.includes('advantage red court')) return 'Artificial Clay (Red Plus)';
  if (sLow.includes('artificial clay') || sLow.includes('synthetic clay') || sLow.includes('matchclay') || sLow.includes('clayrite') || sLow.includes('claytech') || sLow.includes('topclay') || sLow.includes('smashcourt') || sLow.includes('lano')) return 'Artificial Clay';
  if (sLow.includes('real clay') || sLow.includes('natural clay') || (sLow.includes('clay') && !sLow.includes('artificial') && !sLow.includes('synthetic') && !sLow.includes('red'))) return 'Natural Clay';
  // common misspelling
  if (sLow.includes('artifical')) return 'Artificial Grass';
  return null;
}

function orderCanonical(foundSet) {
  const result = [];
  // Grass group (prefer Artificial variants first)
  ['Artificial Grass', 'Artificial Grass (Savannah)', 'Artificial Grass (TigerTurf)', 'Natural Grass'].forEach(k => { if (foundSet.has(k)) result.push(k); });
  // Clay group
  ['Artificial Clay (Red Plus)', 'Artificial Clay', 'Natural Clay'].forEach(k => { if (foundSet.has(k)) result.push(k); });
  // Hard
  if (foundSet.has('Hard Court')) result.push('Hard Court');
  return result;
}

function splitParts(input) {
  if (!input) return [];
  // split on common delimiters
  return input.toString().split(/[,&/\\|]+/).map(s=>s.trim()).filter(Boolean);
}

function main(){
  if (!fs.existsSync(DATA_JSON)) { console.error('Data file not found:', DATA_JSON); process.exit(1); }
  const raw = fs.readFileSync(DATA_JSON,'utf8');
  fs.writeFileSync(BACKUP, raw, 'utf8');
  console.log('Backup written to', BACKUP);

  let arr;
  try { arr = JSON.parse(raw); } catch(e) { console.error('JSON parse error', e); process.exit(1); }

  let changed = 0;
  arr.forEach(club => {
    if (!club || !club.court_surface) return;
    const parts = splitParts(club.court_surface.replace(/\s*\(\s+/g,' ('));
    const mapped = new Set();
    const leftovers = [];
    parts.forEach(p => {
      const norm = normalizePart(p);
      if (norm) mapped.add(norm);
      else {
        // try to fix simple misspellings
        const fixed = p.replace(/Artifical/i,'Artificial').trim();
        const nf = normalizePart(fixed);
        if (nf) mapped.add(nf);
        else leftovers.push(p.trim());
      }
    });

    if (mapped.size === 0 && leftovers.length === 0) return;

    const ordered = orderCanonical(mapped);
    // append any mapped items that weren't part of canonical ordering (unlikely)
    // then append leftovers
    const extraMapped = [...mapped].filter(x=>!ordered.includes(x));
    const finalParts = ordered.concat(extraMapped).concat(leftovers.filter(Boolean));

    const newSurface = finalParts.join(' / ');
    if (newSurface !== club.court_surface) {
      club.court_surface = newSurface;
      changed++;
    }
  });

  if (changed > 0) {
    fs.writeFileSync(DATA_JSON, JSON.stringify(arr, null, 2) + '\n', 'utf8');
    console.log('Updated', changed, 'club(s)');
  } else {
    console.log('No changes necessary');
  }
}

main();
