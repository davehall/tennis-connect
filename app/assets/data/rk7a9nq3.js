// Lightweight obfuscation wrapper for club dataset
// - Data is stored as base64 JSON in a sibling .b64.txt file and decoded at runtime
// - Assigns globals: window.allClubs, window.counties, window.tennisSurfaceOptions, window.tennisSurfaceClassification
// - Logic lifted from the original clubs.js (normalisation, classification, diagnostics)
(function(){
  const DATA_PATH = '/assets/data/rk7a9nq3.b64.txt';

  function decodeBase64Json(b64){
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
      const json = new TextDecoder().decode(bytes);
      return JSON.parse(json);
    } catch(e){
      return null;
    }
  }

  async function expose(){
    try {
      const res = await fetch(DATA_PATH, { cache: 'no-cache', credentials: 'omit' });
      if(!res.ok){ return; }
      const b64 = (await res.text()).trim();
      const arr = decodeBase64Json(b64);
      if(!Array.isArray(arr)) return;

      // Work on a live array reference and expose early so dependants can poll/use it
      let allClubs = arr;
      window.allClubs = window.allClubs || allClubs;

      // Normalize boolean-like fields (indoor, floodlit)
      allClubs.forEach(c => {
        ['indoor','floodlit'].forEach(key => {
          if (!Object.prototype.hasOwnProperty.call(c, key)) return;
          const v = c[key];
          if (typeof v === 'string') {
            const lv = v.trim().toLowerCase();
            if (['true','yes','1','y'].includes(lv)) c[key] = true;
            else if (['false','no','0','n'].includes(lv)) c[key] = false;
            else c[key] = undefined;
          } else if (typeof v === 'number') {
            c[key] = v !== 0;
          } else {
            c[key] = !!v;
          }
        });
      });

      // Infer indoor from canonical court_type when missing
      allClubs.forEach(c => {
        if (Object.prototype.hasOwnProperty.call(c, 'indoor')) return;
        if (!c.court_type) return;
        const ct = String(c.court_type).trim().toLowerCase();
        if (ct === 'outdoor') c.indoor = false;
        else if (ct === 'indoor') c.indoor = true;
        else c.indoor = undefined;
      });

      // Deterministic alphabetical sort by name
      allClubs = allClubs.slice().sort((a,b)=> (a?.name||'').localeCompare(b?.name||'', undefined, { sensitivity:'base' }));
      // Update window reference to sorted array
      window.allClubs = allClubs;

      // Counties
      const counties = [...new Set(allClubs.map(club => club.county).filter(Boolean))].sort();
      window.counties = window.counties || counties;

      // JSON snapshot for maintenance scripts
      try { window.__ALL_CLUBS_JSON__ = JSON.parse(JSON.stringify(allClubs)); } catch(e) {}

      // Tennis surface options & classification (canonical-first)
      (function(){
        try {
          const CANONICAL = [
            'Artificial Clay',
            'Artificial Clay (Red Plus)',
            'Natural Clay',
            'Artificial Grass',
            'Artificial Grass (Savannah)',
            'Artificial Grass (TigerTurf)',
            'Natural Grass',
            'Hard Court'
          ];

          const normalizeSplit = s => (s || '').toString().split(/[,&/\\|]+/).map(p => p.trim()).filter(Boolean);
          const rawPresent = [];
          allClubs.forEach(c => {
            if (Array.isArray(c.court_types)) {
              c.court_types.forEach(t => { if (t && t.toString().trim()) rawPresent.push(t.toString().trim()); });
            }
            if (c.court_type && c.court_type.toString().trim()) {
              normalizeSplit(c.court_type).forEach(p => rawPresent.push(p));
            }
          });
          const presentTypes = [...new Set(rawPresent)];
          const tennisSurfaceOptions = presentTypes.length
            ? CANONICAL.filter(can => presentTypes.some(p => p.toLowerCase() === can.toLowerCase()))
            : CANONICAL.slice();

          const classifySegment = seg => {
            if (!seg || !seg.trim()) return null;
            const s = seg.toLowerCase();
            if (s.includes('savannah')) return 'Artificial Grass (Savannah)';
            if (s.includes('tigerturf') || s.includes('tiger')) return 'Artificial Grass (TigerTurf)';
            if (s.includes('artificial grass') || s.includes('synthetic grass') || s.includes('astroturf') || s.includes('astro')) return 'Artificial Grass';
            if (s.includes('natural') && s.includes('grass')) return 'Natural Grass';
            if (s === 'grass' || (s.includes('grass') && !s.includes('artificial') && !s.includes('synthetic'))) return 'Natural Grass';
            if (s.includes('hardcourt') || s.includes('hard court') || s.includes('acrylic') || s.includes('poraflex') || s.includes('polymeric')) return 'Hard Court';
            if (s.includes('redplus') || s.includes('red plus') || s.includes('red+')) return 'Artificial Clay (Red Plus)';
            if (s.includes('advantage red') || s.includes('advantage red court')) return 'Artificial Clay (Red Plus)';
            if (s.includes('artificial clay') || s.includes('synthetic clay') || s.includes('matchclay') || s.includes('clayrite') || s.includes('claytech') || s.includes('topclay') || s.includes('smashcourt') || s.includes('lano')) return 'Artificial Clay';
            if (s.includes('real clay') || s.includes('natural clay') || (s.includes('clay') && !s.includes('artificial') && !s.includes('synthetic') && !s.includes('red'))) return 'Natural Clay';
            return null;
          };

          const classification = {};
          allClubs.forEach(c => {
            if (c.sport !== 'Tennis') return;
            const explicitSet = new Set();
            if (Array.isArray(c.court_types)) {
              c.court_types.forEach(t => {
                if (!t) return;
                const trimmed = t.toString().trim();
                const match = CANONICAL.find(can => can.toLowerCase() === trimmed.toLowerCase());
                if (match) explicitSet.add(match);
              });
            }
            if (c.court_type && c.court_type.toString().trim()) {
              normalizeSplit(c.court_type).forEach(part => {
                const match = CANONICAL.find(can => can.toLowerCase() === part.toLowerCase());
                if (match) explicitSet.add(match);
              });
            }
            if (explicitSet.size) { classification[c.id] = explicitSet; return; }
            if (!c.court_surface) return;
            const parts = c.court_surface.split(/[,&/\\|]/).map(p => p.trim()).filter(Boolean);
            parts.forEach(p => {
              const cleaned = p.replace(/court/i, '').replace(/\//g, '').trim();
              const cat = classifySegment(cleaned);
              if (cat) {
                if (!classification[c.id]) classification[c.id] = new Set();
                classification[c.id].add(cat);
              }
            });
          });

          window.tennisSurfaceOptions = tennisSurfaceOptions.length ? tennisSurfaceOptions : CANONICAL.slice();
          window.tennisSurfaceClassification = Object.fromEntries(
            Object.entries(classification).map(([id, set]) => [id, [...set]])
          );
        } catch(e) {
          window.tennisSurfaceOptions = ['Artificial Grass', 'Artificial Grass (Savannah)', 'Artificial Grass (TigerTurf)', 'Natural Grass', 'Hard Court', 'Artificial Clay', 'Artificial Clay (Red Plus)', 'Natural Clay'];
          window.tennisSurfaceClassification = {};
        }
      })();

      // Normalize capitalized Website -> website
      allClubs.forEach(c => {
        if (!c) return;
        if (!Object.prototype.hasOwnProperty.call(c, 'website') && Object.prototype.hasOwnProperty.call(c, 'Website')) {
          c.website = c.Website || undefined;
          try { delete c.Website; } catch(e) {}
        }
      });

      // Diagnostics
      (function(){
        try {
          const counts = {};
          allClubs.forEach(c => { if (c && typeof c.id !== 'undefined') counts[c.id] = (counts[c.id]||0)+1; });
          window._clubsDuplicateIds = Object.entries(counts).filter(([id,n])=>n>1).map(([id,n])=>({id:Number(id),count:n}));
          window._allClubsCount = allClubs.length;
        } catch(e) {}
      })();
    } catch(e) {
      // swallow
    }
  }

  // Defer exposure minimally to keep load order stable and reduce trivial scraping
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(expose, 0);
  } else {
    window.addEventListener('DOMContentLoaded', expose, { once:true });
  }
})();
