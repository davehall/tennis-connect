import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Expose React globally for legacy external scripts (components.js) expecting a global React
if (typeof window !== 'undefined') {
  if (!window.React) window.React = React;
  if (!window.ReactDOM) window.ReactDOM = { createRoot };
}

// Tuning: how much to pad bounds (fractional) when auto-fitting markers on md+ screens.
// Larger value => more zoomed out. Small screens use pixel padding instead.
// Make this responsive so wider screens zoom out a bit more for context.
const getMarkerFitPadDesktop = () => {
  try {
    const w = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1024;
    if (w >= 1280) return 0.42; // xl screens zoom out a bit more
    if (w >= 1024) return 0.36; // lg
    if (w >= 768) return 0.34;  // md
  } catch {}
  return 0.32; // sensible default
};

// Expect clubs.js, components.js loaded before this bundle (kept external for now)
// Access their globals (allClubs, counties, icon components) off window.
const {
  Logo, SearchIcon, ListIcon, MapViewIcon,
  CourtIcon, CourtSurfaceIcon, FloodlitIcon,
  IndoorIcon, OutdoorIcon, WebsiteIcon
} = window;

// Safe access helpers (globals provided by clubs.js/components.js may not yet be loaded)
const getAllClubsSafe = () => (Array.isArray(window.allClubs) ? window.allClubs : []);
const getCountiesSafe = () => (Array.isArray(window.counties) ? window.counties : []);

function ClubCard({ club, isSelected, onClick, priority=false, animateOnLoad=false, appearDelay=0 }) {
  const cardRef = useRef(null);
  // Apply a subtle staggered enter animation on initial page entry
  useEffect(() => {
    if (!animateOnLoad) return;
    const el = cardRef.current;
    if (!el) return;
    // Kick off transition to visible state with a per-item delay
    const start = () => {
      el.style.transition = 'transform 380ms cubic-bezier(.2,.9,.2,1), opacity 380ms ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    };
    const tid = setTimeout(start, Math.max(0, appearDelay));
    return () => clearTimeout(tid);
  }, [animateOnLoad, appearDelay]);
  const cardClasses = `bg-white rounded-md border p-5 transition-all duration-300 cursor-pointer ${isSelected ? 'ring-2 ring-teal-500' : 'hover:shadow-md hover:-translate-y-0.5'}`;
  const hasWebsite = club.website && club.website.toString().trim();
  let host = null;
  if (hasWebsite) {
    const raw = club.website.toString().trim();
    try { host = (new URL(raw)).hostname.replace(/^www\./,''); } catch(err) {
      try { host = raw.replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,''); } catch(e) { host = null; }
    }
  }
  const previewImg = (window.DISABLE_PREVIEWS ? '' : '/images/previews/' + club.id + '.jpg');
  // Optional placeholder if we decide to show one later (kept for potential future use)
  const placeholderSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56' fill='none'><rect width='56' height='56' rx='12' fill='%23f1f5f9'/><path d='M18 38L26.2 26.8L32 34.2L35.8 29L38 32V38H18Z' fill='%230f172a' fill-opacity='0.08'/><circle cx='23.5' cy='22.5' r='4.5' fill='%230f172a' fill-opacity='0.12'/></svg>`);
  // Manifest removed – rely on club.* fields only
  // Use absolute paths so they resolve under both / and /search/
  // Normalize relative asset paths (e.g., images/logos/foo.png) to root-absolute
  const normalizeAssetUrl = (u) => {
    try {
      const s = (u || '').toString().trim();
      if (!s) return '';
      if (s.startsWith('data:')) return s;
      if (/^([a-z]+:)?\/\//i.test(s)) return s; // http(s) or protocol-relative
      if (s.startsWith('/')) return s; // already absolute
      if (s.startsWith('images/') || s.startsWith('logos/') || s.startsWith('assets/') || s.startsWith('img/')) {
        return '/' + s.replace(/^\/+/, '');
      }
      return s;
    } catch { return (u || ''); }
  };
  const customFavicon = normalizeAssetUrl((club.favicon || club.favicon_url || club.icon || club.logo || '').toString().trim());
  // Derive a website-root favicon (https://host/favicon.ico) when possible
  const derivedFavicon = (() => {
    if (!host) return '';
    try {
      // Prefer HTTPS; most sites redirect from HTTP anyway
      return `https://${host.replace(/\/$/, '')}/favicon.ico`;
    } catch { return ''; }
  })();
  // Build candidate chain for thumbnail images.
  // Prefer explicit local club images (customFavicon) first so we don't fall back
  // to fetching a website's /favicon.ico. Previews remain available but after
  // the local logo to ensure locally-stored logos take precedence.
  const buildThumbChain = () => {
    const chain = [];
    // If the club explicitly provides a local asset (normalized to root-absolute), try that first
    if (customFavicon && customFavicon.startsWith('/')) {
      chain.push(customFavicon);
    }
    // Next prefer a preview image if previews are enabled and the club isn't forcing favicon-only
    if (!window.DISABLE_PREVIEWS && !club.use_favicon_thumbnail) {
      if (previewImg) chain.push(previewImg);
    }
    // If the custom favicon exists but wasn't a root-local path (e.g., an https URL), try it now
    if (customFavicon && !customFavicon.startsWith('/')) {
      chain.push(customFavicon);
    }
    // Lastly, only try the derived website-root favicon as a final fallback
    if (derivedFavicon) chain.push(derivedFavicon);
    // No branded fallback: if all sources fail, we'll hide the image element
    return chain;
  };
  const thumbChain = buildThumbChain();
  const imgProps = {
    src: thumbChain[0],
    alt: `Logo ${club.name}`,
    loading: priority ? 'eager' : 'lazy',
    fetchpriority: priority ? 'high' : 'auto',
    decoding: priority ? 'sync' : 'async',
    width: 56,
    height: 56,
    sizes: '(max-width: 640px) 56px, 56px',
    onError: e => {
      const el = e.currentTarget;
      let idx = parseInt(el.dataset._thumbIdx || '0', 10);
      if (Number.isNaN(idx)) idx = 0;
      const next = idx + 1;
      if (next < thumbChain.length) {
        el.dataset._thumbIdx = String(next);
        el.src = thumbChain[next];
        return;
      }
      // Nothing else to try: hide the image entirely
      el.onerror = null;
      el.style.display = 'none';
    },
    className: 'h-14 w-14 rounded-md object-contain flex-shrink-0 border border-slate-300 bg-white p-2'
  };

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      onClick={onClick}
      id={`club-card-${club.id}`}
      style={animateOnLoad ? { opacity: 0, transform: 'translateY(10px)' } : undefined}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <img {...imgProps} />
          <div>
            <h3 className="font-heading font-semibold text-lg text-slate-800 mb-1.5">{club.name}</h3>
            <p className="text-sm text-slate-600 mt-1.5">{club.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {hasWebsite && (()=>{
            const raw = club.website.toString().trim();
            const url = /^(https?:)?\/\//i.test(raw) ? (raw.startsWith('http') ? raw : 'https:' + raw) : `https://${raw}`;
            let hostDisp=''; try { hostDisp = (new URL(url)).hostname.replace(/^www\./,''); } catch(e){}
            return (
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={hostDisp ? `Open website ${hostDisp}` : 'Open website'} title={hostDisp ? `Open ${hostDisp}` : 'Website'} onClick={e=> e.stopPropagation()} className="group w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-teal-600 hover:text-white transition">
                <WebsiteIcon className="block h-[18px] w-[18px] translate-x-[1px]" />
              </a>
            );
          })()}
          <a href={`https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}`} target="_blank" rel="noopener noreferrer" aria-label={`Get directions to ${club.name}`} title="Get directions" onClick={(e)=>e.stopPropagation()} className="group w-9 h-9 inline-flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-teal-600 hover:text-white transition">
            <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s6-5.686 6-10a6 6 0 10-12 0c0 4.314 6 10 6 10z" /><circle cx="12" cy="11" r="2.5" /></svg>
          </a>
        </div>
      </div>
      {!(club.sport === 'Padel' || club.sport === 'Pickleball') && (
        <div className="mt-3 pt-3 flex flex-wrap gap-x-4 gap-y-2 text-slate-600 border-t border-slate-200">
          {club.courts && <div className="flex items-center gap-1.5" title={`${club.courts} courts`}><CourtIcon className="h-5 w-5 text-slate-400" /><span className="text-sm font-medium">{club.courts} Courts</span></div>}
          {club.court_surface && <div className="flex items-center gap-1.5" title="Court Surface"><CourtSurfaceIcon className="h-5 w-5 text-slate-400" /><span className="text-sm font-medium">{club.court_surface}</span></div>}
          {((club.court_type && club.court_type.toString().trim()) || Object.prototype.hasOwnProperty.call(club, 'indoor')) && (
            <div className="flex items-center gap-1.5" title="Indoor / Outdoor">
              {(() => {
                const ctRaw = club.court_type && club.court_type.toString().trim();
                const ct = ctRaw ? ctRaw.toLowerCase() : '';
                if (ct === 'outdoor' || (!ct && club.indoor === false)) return <OutdoorIcon className='h-5 w-5 text-slate-400' />;
                if (ct === 'indoor' || ct === 'indoor/outdoor' || (ct.includes('indoor') && ct.includes('outdoor')) || club.indoor === true) return <IndoorIcon className='h-5 w-5 text-slate-400' />;
                if (ct.includes('outdoor')) return <OutdoorIcon className='h-5 w-5 text-slate-400' />;
                if (ct.includes('indoor')) return <IndoorIcon className='h-5 w-5 text-slate-400' />;
                return null;
              })()}
              <span className="text-sm font-medium">
                {club.court_type && club.court_type.toString().trim() ? club.court_type.toString().trim() : (club.indoor === true ? 'Indoor' : (club.indoor === false ? 'Outdoor' : ''))}
              </span>
            </div>
          )}
          {club.floodlit && <div className="flex items-center gap-1.5" title="Floodlit Courts"><FloodlitIcon className="h-5 w-5 text-slate-400" /><span className="text-sm font-medium">Floodlit</span></div>}
        </div>
      )}
    </div>
  );
}

const SuggestClubModal = React.memo(function SuggestClubModal({ open, onClose, submitted, form, errors, isSubmitting, onChange, onSubmit }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-md shadow-2xl w-full max-w-lg p-6 animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-heading font-bold text-slate-800">Suggest a Club</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">✕</button>
        </div>
        {submitted ? (
          <div className="py-10 text-center" aria-live="polite">
            <p className="text-lg font-medium text-teal-600">✅ Sent!</p>
            <p className="text-slate-600 mt-2 text-sm">Thanks for helping improve the map. We'll review it shortly.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate name="suggestClubForm" className="space-y-4 text-sm">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Description<span className="text-teal-500">*</span></label>
              <textarea autoFocus required name="notes" value={form.notes} onChange={onChange} rows={4} className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${errors.notes ? 'border-red-400 focus:ring-red-400/50' : 'border-slate-300'}`} placeholder="Describe the club or suggestion" aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'err-notes' : undefined} />
              {errors.notes && <p id="err-notes" className="mt-1 text-xs text-red-600">{errors.notes}</p>}
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact email<span className="text-teal-500">*</span></label>
              <input type="email" name="email" value={form.email} onChange={onChange} className={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/50 ${errors.email ? 'border-red-400 focus:ring-red-400/50' : 'border-slate-300'}`} placeholder="you@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'err-email' : undefined} />
              {errors.email && <p id="err-email" className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            <div className="flex items-center justify-between pt-2">
              <button type="submit" disabled={isSubmitting} className={`bg-teal-500 text-white font-semibold px-5 py-2 rounded-md shadow-sm transition ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-teal-600'}`}>{isSubmitting ? 'Submitting...' : 'Submit'}</button>
            </div>
            {errors && errors.submit && (
              <div className="mt-2 text-sm text-red-600" role="alert">{errors.submit}</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
});

function ClubFinder(){
  // Local copy of clubs once available to avoid race (bundle executing before clubs.js)
  const [allClubsLocal, setAllClubsLocal] = useState(()=> getAllClubsSafe());
  // Poll briefly (max ~5s) for global dataset if not yet present
  useEffect(()=>{
  if(allClubsLocal && allClubsLocal.length) return;
    let attempts = 0;
    const interval = setInterval(()=>{
      const current = getAllClubsSafe();
      if(current.length){
        setAllClubsLocal(current);
        try { window.dispatchEvent(new Event('clubsdataready')); } catch(_){}
        clearInterval(interval); return;
      }
      if(++attempts > 30){ clearInterval(interval); if(!current.length) console.warn('allClubs data not loaded after waiting'); }
    },120);
    return ()=> clearInterval(interval);
  }, [allClubsLocal]);

  const [filteredClubs, setFilteredClubs] = useState(()=>
    getAllClubsSafe()
      .filter(c => c.sport === 'Tennis')
      .slice()
      .sort((a,b) => (a?.name||'').localeCompare(b?.name||'', undefined, { sensitivity:'base' }))
  );
  const [activeSport, setActiveSport] = useState('Tennis');
  const [rawLocationSearch, setRawLocationSearch] = useState(() => {
    try {
      const params = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams();
      return params.get('query') || params.get('q') || '';
    } catch (e) {
      return '';
    }
  });
  const [locationSearch, setLocationSearch] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  // Seed surface filter from URL param if present
  const urlParams = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const surfaceParam = urlParams.get('surface') || '';
  const [surfaceFilter, setSurfaceFilter] = useState(surfaceParam);
  const [indoorFilter, setIndoorFilter] = useState('');
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [isSuggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestSubmitted, setSuggestSubmitted] = useState(false);
  const [form, setForm] = useState({ name:'', sport:'Tennis', county:'', address:'', website:'', email:'', notes:'' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileListVisible, setMobileListVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState('az'); // 'az' | 'za'
  const [isMobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFiltersPanelRef = useRef(null);
  const firstMobileFilterRef = useRef(null);
  const [isTopHeaderHidden, setTopHeaderHidden] = useState(false); // retained but no longer slides header
  const [didInitialListAnimate, setDidInitialListAnimate] = useState(false);

  // Refs for scroll tracking (mobile list) and header measurement
  const listScrollRef = useRef(null);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const logoRowRef = useRef(null);
  const tabsRowRef = useRef(null);
  const mobileFiltersRef = useRef(null);
  const tabRefs = useRef({});
  const [logoRowHeight, setLogoRowHeight] = useState(80);
  const [tabsRowHeight, setTabsRowHeight] = useState(64);
  const headerHiddenRef = useRef(false);
  const hideSentinelRef = useRef(null);
  const sentinelObsRef = useRef(null);
  const useSentinelRef = useRef(false);
  const [sentinelOffset, setSentinelOffset] = useState(220);
  // Configurable trigger: which card index should the header hide after? (1-based)
  // Override with localStorage.setItem('tcm.sentinelCards', '3') if needed.
  const sentinelCardsRef = useRef(3);
  // Dynamic hysteresis thresholds derived from sentinel offset for fallback scroll logic
  const [dynamicThresholds, setDynamicThresholds] = useState({ hidePx: 220, showPx: 60 });
  const [suppressHeaderHide, setSuppressHeaderHide] = useState(false);
  const suppressRef = useRef(false);
  const isIOSRef = useRef(false);
  const showDebounceRef = useRef(0);

  // Detect iOS/iPadOS Safari/Chrome (Chrome on iOS still uses Safari engine)
  useEffect(()=>{
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isIOS = /iP(ad|hone|od)/.test(ua) || ((/Mac/.test(ua) || /Mac/.test(navigator.platform||'')) && 'ontouchend' in window);
    isIOSRef.current = !!isIOS;
  }, []);

  const mapRef = useRef(null); const markersRef = useRef({}); const didInitialFitRef = useRef(false);
  // Basemap selection (persisted)
  const hasMTKey = (typeof window !== 'undefined' && !!window.MAPTILER_KEY);
  const [basemapPreset, setBasemapPreset] = useState(()=>{
    try { const s = localStorage.getItem('basemapPreset'); if(s) return s; } catch(_){ }
    // Always default to CARTO Voyager view
    return 'carto:voyager';
  });
  const tileLayerRef = useRef(null);

  // Debounce search input: slightly faster on desktop, a bit slower on mobile
  const getSearchDebounceMs = () => {
    try {
      if (typeof window !== 'undefined') {
        const w = window.innerWidth || 1024;
        return w < 768 ? 240 : 140; // mobile: 240ms, desktop: 140ms
      }
    } catch(_){}
    return 180; // fallback
  };
  useEffect(()=> { const t=setTimeout(()=> setLocationSearch(rawLocationSearch), getSearchDebounceMs()); return ()=> clearTimeout(t); }, [rawLocationSearch]);

  // On small screens, when the user types into the global search box, open the
  // mobile list panel automatically so they immediately see matching clubs.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const isSmall = window.innerWidth < 768;
      if (!isSmall) return;
      if (rawLocationSearch && rawLocationSearch.trim().length > 0) {
        setMobileListVisible(true);
        // Close mobile filters if open (we want list visible)
        setMobileFiltersOpen(false);
        // Hide the top header for extra vertical space on mobile lists
        setTopHeaderHidden(true);
      }
    } catch (_) {}
  }, [rawLocationSearch]);

  // Auto-focus search on desktop initial load
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) {
      const t = setTimeout(()=>{ try { document.getElementById('global-search')?.focus(); } catch(_){} }, 250);
      return ()=> clearTimeout(t);
    }
  }, []);

  // '/' hotkey to focus search when not typing in a field
  useEffect(()=>{
    const onKey = (e)=>{
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      try { document.getElementById('global-search')?.focus(); } catch(_){}
    };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(()=> { if(activeSport !== 'Tennis' && surfaceFilter) setSurfaceFilter(''); }, [activeSport]);

  const tennisSurfaces = React.useMemo(()=> window.tennisSurfaceOptions || [], []); // eslint-disable-line
  const CANONICAL_SURFACES = React.useMemo(()=> ['Artificial Clay','Natural Clay','Artificial Grass','Natural Grass','Hardcourt'], []);

  useEffect(()=> {
    const classification = window.tennisSurfaceClassification || {};
    const surfaceToCourtType = {
  'Artificial Clay': ['Artificial Clay'], 'Natural Clay': ['Real Clay'], 'Artificial Grass': ['Artificial Grass'], 'Natural Grass': ['Real Grass'], 'Hard Court': ['Hard Court']
    };
    const UI_TO_INTERNAL = { 'Hardcourt':'Hard Court' };
    const keywordMap = {
      'Artificial Grass': ['synthetic grass','artificial grass','astro','astroturf','savannah','savannah turf','tiger','tigerturf','tiger turf','tiger turf advantage pro'],
  'Natural Grass': ['natural grass','real grass'],
      'Hard Court': ['hardcourt','hard court','hard-court','acrylic','poraflex','polymeric','poroplast'],
      'Hardcourt': ['hardcourt','hard court','hard-court','acrylic','poraflex','polymeric','poroplast'],
  'Natural Clay': ['real clay','clay'],
  'Artificial Clay': ['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt']
    };
    let filtered=[];
  try { filtered = allClubsLocal.filter(club => {
      const sportMatch = activeSport ? club.sport === activeSport : true;
      const countyMatch = countyFilter ? club.county === countyFilter : true;
      let surfaceMatch = true; const cats = classification[club.id] || [];
      if (activeSport === 'Tennis' && surfaceFilter) {
        const requested = UI_TO_INTERNAL[surfaceFilter] || surfaceFilter;
        if (club.court_type && club.court_type.toString().trim()) {
          const ct = club.court_type.toString().trim().toLowerCase();
          const allowedCTs = (surfaceToCourtType[requested] || []).map(s => s.toLowerCase());
          if (allowedCTs.length && allowedCTs.includes(ct)) surfaceMatch = true; else {
            if (cats.includes(requested)) surfaceMatch=true; else {
              const raw = (club.court_surface || '').toLowerCase(); const kws = keywordMap[requested] || [];
              if (requested === 'Natural Clay') {
                const hasRealClayPhrase = raw.includes('real clay'); const hasGenericClay = raw.includes('clay');
                const syntheticIndicators = ['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt'];
                const isSyntheticClay = syntheticIndicators.some(s => raw.includes(s)); const isRedPlusClay = raw.includes('redplus') || raw.includes('red plus') || raw.includes('red+');
                surfaceMatch = (hasRealClayPhrase || (hasGenericClay && !isSyntheticClay && !isRedPlusClay));
              } else if (requested === 'Synthetic Clay') {
                const syntheticIndicators = ['synthetic clay','artificial clay','matchclay','clayrite','lano','claytech','topclay','smashcourt']; surfaceMatch = syntheticIndicators.some(s => raw.includes(s));
              } else if (requested === 'Natural Grass') {
                const syntheticIndicators = ['synthetic grass','artificial grass','astroturf','astro','savannah','tigerturf','tiger'];
                const hasNaturalPhrase = raw.includes('natural grass') || raw.includes('real grass'); const hasGenericGrass = raw.includes('grass');
                surfaceMatch = hasNaturalPhrase || (hasGenericGrass && !syntheticIndicators.some(s => raw.includes(s)));
              } else {
                surfaceMatch = kws.some(k => raw.includes(k));
              }
            }
          }
        } else {
          const raw = (club.court_surface || '').toLowerCase(); const requested = UI_TO_INTERNAL[surfaceFilter] || surfaceFilter; const kws = keywordMap[requested] || [];
          if (cats.includes(requested)) surfaceMatch=true; else if (requested === 'Natural Clay') {
            const hasRealClayPhrase = raw.includes('real clay'); const hasGenericClay = raw.includes('clay');
            const syntheticIndicators = ['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt']; const isSyntheticClay = syntheticIndicators.some(s => raw.includes(s)); const isRedPlusClay = raw.includes('redplus') || raw.includes('red plus') || raw.includes('red+');
            surfaceMatch = (hasRealClayPhrase || (hasGenericClay && !isSyntheticClay && !isRedPlusClay));
          } else if (requested === 'Synthetic Clay') {
            const syntheticIndicators = ['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt']; surfaceMatch = syntheticIndicators.some(s => raw.includes(s));
          } else if (requested === 'Natural Grass') {
            const syntheticIndicators = ['synthetic grass','artificial grass','astroturf','astro','savannah','tigerturf','tiger']; const hasNaturalPhrase = raw.includes('natural grass') || raw.includes('real grass'); const hasGenericGrass = raw.includes('grass');
            surfaceMatch = hasNaturalPhrase || (hasGenericGrass && !syntheticIndicators.some(s => raw.includes(s)));
          } else {
            surfaceMatch = kws.some(k => raw.includes(k));
          }
        }
      }
      let indoorMatch = true;
      if (indoorFilter === 'outdoor') {
        if (club.court_type && club.court_type.toString().trim()) {
          indoorMatch = club.court_type.toString().trim().toLowerCase() === 'outdoor';
        } else if (Object.prototype.hasOwnProperty.call(club, 'indoor')) indoorMatch = club.indoor === false; else indoorMatch=false;
      } else if (indoorFilter === 'indoor') {
        if (club.court_type && club.court_type.toString().trim()) {
          const ct = club.court_type.toString().trim().toLowerCase(); indoorMatch = ct === 'indoor' || ct === 'indoor/outdoor';
        } else if (Object.prototype.hasOwnProperty.call(club, 'indoor')) indoorMatch = club.indoor === true; else indoorMatch=false;
      }
  // Only match against the club name (title). Do not match address or other fields.
  const locationMatch = locationSearch.trim() === '' || (club.name && club.name.toLowerCase().includes(locationSearch.toLowerCase()));
      return sportMatch && countyMatch && surfaceMatch && indoorMatch && locationMatch;
    }); } catch(err) {
      console.error('Filter computation failed', err);
      filtered = allClubsLocal.filter(c=>c.sport==='Tennis').slice().sort((a,b)=>(a?.name||'').localeCompare(b?.name||'', undefined, { sensitivity:'base' }));
    }
    const cmp = (a,b)=> (a?.name||'').localeCompare(b?.name||'', undefined, { sensitivity:'base' });

    // Normalize text for consistent matching (remove diacritics, lowercase)
    const normalizeText = (s) => String(s || '').normalize && String(s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase() || String(s || '').toLowerCase();

    // Scoring function: prefix (starts-with) matches first, then first-token prefix,
    // then any token prefix, then contains, then others.
    const makeNameScore = (query) => {
      const q = normalizeText(query || '').trim();
      return (name) => {
        const n = normalizeText(name || '');
        if (!q) return 10; // neutral score when no query
        if (n.startsWith(q)) return 0;
        const tokens = n.split(/\s+/).filter(Boolean);
        if (tokens[0] && tokens[0].startsWith(q)) return 1;
        if (tokens.some(t => t.startsWith(q))) return 2;
        if (n.includes(q)) return 3;
        return 9;
      };
    };

    // If there's an active location search, prefer prefix/token-first matches.
    if (locationSearch && locationSearch.trim()) {
      const score = makeNameScore(locationSearch);
      filtered.sort((a,b)=>{
        const sa = score(a.name || '');
        const sb = score(b.name || '');
        if (sa !== sb) return sa - sb;
        // tie-break by alphabetical (or reverse if requested)
        return sortOrder === 'za' ? -cmp(a,b) : cmp(a,b);
      });
    } else {
      filtered.sort((a,b)=> sortOrder === 'za' ? -cmp(a,b) : cmp(a,b));
    }
    setFilteredClubs(filtered); setSelectedClubId(null);
  }, [activeSport, countyFilter, surfaceFilter, indoorFilter, locationSearch, allClubsLocal, sortOrder]);

  const surfaceCounts = React.useMemo(()=>{ const classification = window.tennisSurfaceClassification || {}; const UI_TO_INTERNAL={ 'Hardcourt':'Hard Court' }; const keywordMap={ 'Artificial Grass':['synthetic grass','artificial grass','astro','astroturf','savannah','savannah turf','tiger','tigerturf','tiger turf','tiger turf advantage pro'],'Natural Grass':['natural grass','real grass'],'Hard Court':['hardcourt','hard court','hard-court','acrylic','poraflex','polymeric','poroplast'],'Hardcourt':['hardcourt','hard court','hard-court','acrylic','poraflex','polymeric','poroplast'],'Natural Clay':['real clay','clay'],'Artificial Clay':['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt'] }; const surfaceToCourtType={ 'Artificial Clay':['Artificial Clay'],'Natural Clay':['Real Clay'],'Artificial Grass':['Artificial Grass'],'Natural Grass':['Real Grass'],'Hard Court':['Hard Court']}; const counts={}; CANONICAL_SURFACES.forEach(ui=>counts[ui]=0); allClubsLocal.forEach(club=>{ CANONICAL_SURFACES.forEach(ui=>{ const requested=UI_TO_INTERNAL[ui]||ui; let matched=false; if (club.court_type && club.court_type.toString().trim()) { const ct=club.court_type.toString().trim().toLowerCase(); const allowedCTs=(surfaceToCourtType[requested]||[]).map(s=>s.toLowerCase()); if (allowedCTs.length && allowedCTs.includes(ct)) matched=true; } if(!matched){ const raw=(club.court_surface||'').toLowerCase(); if (requested==='Natural Clay'){ const hasRealClayPhrase=raw.includes('real clay'); const hasGenericClay=raw.includes('clay'); const syntheticIndicators=['synthetic clay','artificial clay','artifical clay','matchclay','clayrite','lano','claytech','topclay','smashcourt']; const isSyntheticClay=syntheticIndicators.some(s=>raw.includes(s)); const isRedPlusClay=raw.includes('redplus')||raw.includes('red plus')||raw.includes('red+'); matched=(hasRealClayPhrase||(hasGenericClay&&!isSyntheticClay&&!isRedPlusClay)); } else if (requested==='Natural Grass'){ const syntheticIndicators=['synthetic grass','artificial grass','astroturf','astro','savannah','tigerturf','tiger']; const hasNaturalPhrase=raw.includes('natural grass')||raw.includes('real grass'); const hasGenericGrass=raw.includes('grass'); matched=hasNaturalPhrase||(hasGenericGrass&&!syntheticIndicators.some(s=>raw.includes(s))); } else { matched=(keywordMap[requested]||[]).some(k=>raw.includes(k)); } } if(matched) counts[ui]++; }); }); return counts; }, [allClubsLocal]); // eslint-disable-line

  // Surfaces ordered by most to least frequent (stable by canonical order on ties)
  const surfacesSorted = React.useMemo(() => {
    const entries = (CANONICAL_SURFACES || []).map(s => [s, surfaceCounts[s] || 0]);
    entries.sort((a, b) => {
      const diff = (b[1] || 0) - (a[1] || 0);
      if (diff !== 0) return diff;
      return CANONICAL_SURFACES.indexOf(a[0]) - CANONICAL_SURFACES.indexOf(b[0]);
    });
    return entries.map(([s]) => s);
  }, [surfaceCounts]);

  // County counts, static per active sport (ignore other filters so counts are always visible)
  const countyCounts = React.useMemo(() => {
    const counts = {};
    const clubs = allClubsLocal;
    for (const club of clubs) {
      if (!club) continue;
      // Only match active sport; ignore other filters so counts stay constant
      const sportMatch = activeSport ? club.sport === activeSport : true;
      if (!sportMatch) continue;
      const county = club.county || '';
      if (!county) continue;
      counts[county] = (counts[county] || 0) + 1;
    }
    return counts;
  }, [allClubsLocal, activeSport]);

  // Measure header height for smooth collapse on mobile when list is scrolled
  useEffect(()=>{
    const measure=()=> {
      if(headerRef.current) setHeaderHeight(headerRef.current.offsetHeight||0);
      if(logoRowRef.current) setLogoRowHeight(logoRowRef.current.scrollHeight||80);
      if(tabsRowRef.current) setTabsRowHeight(tabsRowRef.current.scrollHeight||64);
    };
    // initial + delayed measure for fonts
    measure();
    const t = setTimeout(measure, 50);
    window.addEventListener('resize', measure);
    return ()=> { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, []);

  // Compute sentinel offset based on approximately the Nth card's position (default 3rd), clamped to viewport
  useEffect(()=>{
    const compute = () => {
      const root = listScrollRef.current;
      if(!root) return;
      let desired = 260;
      // Allow overriding card index via localStorage (1..12)
      try {
        const ls = parseInt(localStorage.getItem('tcm.sentinelCards')||'', 10);
        if (!Number.isNaN(ls) && ls >= 1 && ls <= 12) { sentinelCardsRef.current = ls; }
      } catch(_){ }
      try {
        const cards = root.querySelectorAll("div[id^='club-card-']");
        if(cards && cards.length){
          const useIdx = Math.min((sentinelCardsRef.current||3), cards.length) - 1; // 0-based
          if(cards.length >= (useIdx + 1)){
            const el = cards[useIdx];
            desired = (el.offsetTop || 0) + Math.min(16, (el.offsetHeight || 0) * 0.25);
          } else {
            const el = cards[0];
            desired = (el.offsetTop || 0) + (el.offsetHeight || 0) + 24;
          }
        }
      } catch(_){}
      const ch = Math.max(0, listScrollRef.current?.clientHeight || 0);
      const maxTop = Math.max(8, ch - 12);
      const finalTop = Math.min(Math.max(4, desired), maxTop);
      setSentinelOffset(finalTop);
      // Derive fallback thresholds based on offset
      const hidePx = Math.max(140, Math.min(360, Math.floor(finalTop - 12)));
      const showPx = Math.max(28, Math.min(hidePx - 40, Math.floor(hidePx * 0.35)));
      setDynamicThresholds({ hidePx, showPx });
    };
    // compute after render
    const id1 = requestAnimationFrame(compute);
    const id2 = setTimeout(compute, 120);
    window.addEventListener('resize', compute);
    return ()=> { cancelAnimationFrame(id1); clearTimeout(id2); window.removeEventListener('resize', compute); };
  }, [filteredClubs]);

  // Close mobile filters if list is shown on mobile to avoid orphaned overlay
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768 && isMobileListVisible) setMobileFiltersOpen(false);
  }, [isMobileListVisible]);

  // When opening the list on mobile, show the header/tabs initially
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth < 768 && isMobileListVisible) {
      setTopHeaderHidden(false);
      headerHiddenRef.current=false;
      setSuppressHeaderHide(true);
      suppressRef.current = true;
      try {
        if(listScrollRef.current){
          listScrollRef.current.scrollTop = 0;
          // iOS sometimes ignores immediate scrollTop set; try again next frame
          requestAnimationFrame(()=> { try { listScrollRef.current && (listScrollRef.current.scrollTop = 0); } catch(_){} });
        }
        // Focus search when opening list on small screens
        setTimeout(()=>{ try { document.getElementById('global-search')?.focus(); } catch(_){} }, 140);
      } catch(_){ }
    } else if (window.innerWidth < 768 && !isMobileListVisible) {
      setSuppressHeaderHide(false);
      suppressRef.current = false;
    }
  }, [isMobileListVisible]);

  // Manage focus when mobile filters panel opens; basic focus trap and Esc to close
  useEffect(()=>{
    if(!isMobileFiltersOpen){ return; }
    // focus first control after open
    const t = setTimeout(()=>{ try { firstMobileFilterRef.current?.focus(); } catch(_){} }, 80);
    const onKey = (e) => {
      if(!isMobileFiltersOpen) return;
      if(e.key === 'Escape') { e.stopPropagation(); setMobileFiltersOpen(false); return; }
      if(e.key !== 'Tab') return;
      const root = mobileFiltersPanelRef.current;
      if(!root) return;
      const focusables = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if(!focusables || !focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if(e.shiftKey){
        if(document.activeElement === first){ e.preventDefault(); last.focus(); }
      } else {
        if(document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return ()=> { clearTimeout(t); window.removeEventListener('keydown', onKey, true); };
  }, [isMobileFiltersOpen]);

  // Helper: choose mobile filter control padding — slightly taller on iOS small screens,
  // but a little less tall on non-iOS small screens to save vertical space.
  const mobileFilterPaddingClass = () => {
    try {
      const isSmall = (typeof window !== 'undefined' && window.innerWidth < 768);
      if (isSmall) {
        if (isIOSRef.current) return 'py-4 text-lg'; // iOS: noticeably larger tap target + larger text
        return 'py-2.5 text-base'; // non-iOS small screens: a bit less tall
      }
    } catch(_){ }
    return 'py-3 text-base';
  };

  // Helper: search input padding — slightly larger on iOS small screens, slightly smaller elsewhere
  const mobileSearchPaddingClass = () => {
    try {
      const isSmall = (typeof window !== 'undefined' && window.innerWidth < 768);
      if (isSmall) {
        // Apply reduced height on all small screens (including iOS) per request
        return 'py-1.5';
      }
    } catch(_){ }
    return 'py-2';
  };

  // Mark first paint to allow one-time staggered animation of list cards
  useEffect(() => {
    // Run after first filtered set is ready
    if (!didInitialListAnimate && filteredClubs && filteredClubs.length) {
      const t = setTimeout(() => setDidInitialListAnimate(true), 50);
      return () => clearTimeout(t);
    }
  }, [filteredClubs, didInitialListAnimate]);

  // Hide logo row + tabs row when the list is scrolled on mobile; show at top (with hysteresis + rAF to reduce jitter)
  useEffect(()=>{
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) { setTopHeaderHidden(false); headerHiddenRef.current=false; return; }
    if (!isMobileListVisible) { setTopHeaderHidden(false); headerHiddenRef.current=false; return; }
    // Prefer IntersectionObserver when available (non-iOS). On iOS, skip IO and use scroll fallback for stability.
  const root = listScrollRef.current;
  const target = hideSentinelRef.current;
    if (!isIOSRef.current && root && target && typeof IntersectionObserver !== 'undefined'){
      try {
        const obs = new IntersectionObserver((entries)=>{
          const e = entries && entries[0];
          if(!e) return;
          if (suppressRef.current) { // keep header visible until user scrolls
            if (headerHiddenRef.current) { headerHiddenRef.current=false; setTopHeaderHidden(false); }
            return;
          }
          // Robust: compare sentinel's top relative to root viewport top.
          let pastTop = false;
          try {
            const rootTop = (e.rootBounds?.top ?? 0);
            const relTop = e.boundingClientRect.top - rootTop;
            pastTop = relTop <= 0;
          } catch(_){
            pastTop = !e.isIntersecting;
          }
          const shouldHide = pastTop;
          if (headerHiddenRef.current !== shouldHide){
            headerHiddenRef.current = shouldHide;
            setTopHeaderHidden(shouldHide);
          }
        }, { root, threshold: [0], rootMargin: '0px 0px -1px 0px' });
        obs.observe(target);
        // Clear suppression on first meaningful scroll so IO can take over
        const clearSuppressionOnScroll = () => {
          const y = root.scrollTop || 0;
          if (suppressRef.current && y > 2) {
            suppressRef.current = false;
            setSuppressHeaderHide(false);
          }
        };
        root.addEventListener('scroll', clearSuppressionOnScroll, { passive: true });
        sentinelObsRef.current = obs;
        useSentinelRef.current = true;
        return () => { try { obs.disconnect(); } catch(_){} try { root.removeEventListener('scroll', clearSuppressionOnScroll); } catch(_){} sentinelObsRef.current=null; useSentinelRef.current=false; };
      } catch(_){}
    }
  // Fallback to scroll-based when IO is not available or on iOS
    useSentinelRef.current = false;
  const el = listScrollRef.current;
    if (!el) return;
    let rafId = 0;
  const HIDE_THRESHOLD = dynamicThresholds.hidePx; // px (~after a few cards)
  const SHOW_THRESHOLD = dynamicThresholds.showPx;  // px (clear top intent)
    const onScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const y = el.scrollTop || 0;
        // Clear suppression on first meaningful user scroll
        if (suppressRef.current && y > 2) { suppressRef.current=false; setSuppressHeaderHide(false); }
        if (suppressRef.current) { // keep visible until user scrolls
          if (headerHiddenRef.current) { headerHiddenRef.current=false; setTopHeaderHidden(false); }
          return;
        }
        const currentlyHidden = headerHiddenRef.current;
        let nextHidden = currentlyHidden;
        // Immediate hide once beyond threshold; cancel any pending show debounce
        if (!currentlyHidden && y >= HIDE_THRESHOLD) {
          nextHidden = true;
          if (showDebounceRef.current) { clearTimeout(showDebounceRef.current); showDebounceRef.current = 0; }
        } else if (currentlyHidden) {
          // Debounce show near top to avoid flicker from momentum bounce
          if (y <= SHOW_THRESHOLD + 6) {
            if (!showDebounceRef.current) {
              showDebounceRef.current = window.setTimeout(() => {
                showDebounceRef.current = 0;
                const yNow = el.scrollTop || 0;
                if (yNow <= SHOW_THRESHOLD + 6 && !suppressRef.current) {
                  headerHiddenRef.current = false;
                  setTopHeaderHidden(false);
                }
              }, 130);
            }
          } else {
            if (showDebounceRef.current) { clearTimeout(showDebounceRef.current); showDebounceRef.current = 0; }
          }
        }
        if (nextHidden !== currentlyHidden) {
          headerHiddenRef.current = nextHidden;
          setTopHeaderHidden(nextHidden);
        }
      });
    };
    // On iOS, also clear suppression on touchstart/move immediately when user interacts
    const onTouch = () => {
      if (suppressRef.current) { suppressRef.current = false; setSuppressHeaderHide(false); }
    };
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    // initial
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
  return () => { el.removeEventListener('scroll', onScroll); el.removeEventListener('touchstart', onTouch); el.removeEventListener('touchmove', onTouch); if(showDebounceRef.current) { clearTimeout(showDebounceRef.current); showDebounceRef.current = 0; } if(rafId) cancelAnimationFrame(rafId); };
  }, [isMobileListVisible, filteredClubs, dynamicThresholds.hidePx, dynamicThresholds.showPx]);

  const mobileActiveFiltersCount = (countyFilter?1:0)+(surfaceFilter?1:0)+(indoorFilter?1:0)+((rawLocationSearch&&rawLocationSearch.trim())?1:0);

  // Determine mobile input sizing: slightly taller on iOS because native inputs are compact there;
  // otherwise keep them a bit less tall on other small screens.
  const isIOS = isIOSRef.current;
  const mobileSelectClass = `w-full px-4 ${isIOS ? 'py-4' : 'py-3'} border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-base`;
  const globalSearchClass = `block w-full pl-10 pr-10 ${isIOS ? 'py-3.5' : 'py-3'} md:py-2 border border-slate-300 rounded-lg leading-6 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-base`;

  useEffect(()=>{
    if(mapRef.current) return;
    // Wait until the #map container has a non-zero size to avoid Leaflet sizing glitches
    const el = typeof document !== 'undefined' ? document.getElementById('map') : null;
    let raf = 0; let tries = 0;
    const waitUntilSized = () => {
      if(!el){ return false; }
      const w = el.clientWidth || 0;
      const h = el.clientHeight || 0;
      return w > 0 && h > 0;
    };
    const init = () => {
      const base={ south:51.3, west:-10.8, north:55.5, east:-5.0 };
      const isSmall=(typeof window!=='undefined' && window.innerWidth<640);
      const padDeg=isSmall?0.7:0.35;
      const irelandBounds=L.latLngBounds([ base.south-padDeg, base.west-padDeg ], [ base.north+padDeg, base.east+padDeg ]);
      const initialZoom=isSmall?12.5:11;
      const center=[53.4,-7.9];
    const map=L.map('map',{ zoomControl:false, scrollWheelZoom:true, worldCopyJump:false, minZoom:isSmall?6:8, maxZoom:17 }).setView(center,initialZoom);
      map.setMaxBounds(irelandBounds);
      map.options.maxBoundsViscosity=isSmall?0.35:0.7;

      // Helper to apply a basemap preset
      const applyBasemap = (preset)=>{
        if(tileLayerRef.current){ try { map.removeLayer(tileLayerRef.current); } catch(_){} tileLayerRef.current = null; }
        const mtKey = (typeof window !== 'undefined' && window.MAPTILER_KEY) ? window.MAPTILER_KEY : null;
        let url = '';
        let opts = {};
        let p = preset || '';
        if(!p){ p = 'carto:voyager'; }
        if(p.startsWith('mt:') && mtKey){
          const style = p.split(':')[1] || (window.MAPTILER_STYLE || 'streets-v2');
          url = `https://api.maptiler.com/maps/${style}/256/{z}/{x}/{y}.png?key=${mtKey}`;
          opts = { attribution: '<a href="https://www.maptiler.com/copyright/">© MapTiler</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>', crossOrigin: true };
        } else {
          const name = (p.split(':')[1] || (window.CARTO_STYLE || 'voyager'));
          const cartoPath = name === 'light_all' ? 'light_all' : (name === 'dark_all' ? 'dark_all' : 'rastertiles/voyager');
          url = `https://{s}.basemaps.cartocdn.com/${cartoPath}/{z}/{x}/{y}{r}.png`;
          opts = { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', detectRetina: true, crossOrigin: true };
        }
        tileLayerRef.current = L.tileLayer(url, opts).addTo(map);
        try {
          // When tiles first load, ensure map has correct size
          tileLayerRef.current.once('load', ()=> { try { map.invalidateSize(false); } catch(_){} });
        } catch(_){ }
      };

      // Initial basemap
      applyBasemap(basemapPreset);

      L.control.zoom({ position:'topright' }).addTo(map);
      const legend=L.control({ position:'bottomleft' });
      legend.onAdd=function(){ const div=L.DomUtil.create('div','surface-legend hidden sm:block'); div.style.display='none'; return div; };
      legend.addTo(map);
      map._surfaceLegend=legend;
      mapRef.current=map;
      // expose helper for later swaps
      mapRef.current._applyBasemap = applyBasemap;
      // A few sizing passes to be extra safe on first paint
      setTimeout(()=> { try { map.invalidateSize(false); } catch(_){} }, 120);
      setTimeout(()=> { try { map.invalidateSize(false); } catch(_){} }, 360);
      try { window.addEventListener('load', ()=> { try { map.invalidateSize(false); } catch(_){} }); } catch(_){ }
    };
    const tick = () => {
      if (waitUntilSized()) { init(); return; }
      if (++tries > 60) { // ~1s @ 60fps fallback: init anyway and rely on later invalidates
        init(); return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return ()=> { if(raf) cancelAnimationFrame(raf); };
  }, []);

  // React to preset changes at runtime
  useEffect(()=>{
    if(mapRef.current && mapRef.current._applyBasemap){
      try { mapRef.current._applyBasemap(basemapPreset); } catch(_){ }
      try { localStorage.setItem('basemapPreset', basemapPreset); } catch(_){ }
    }
  }, [basemapPreset]);

  useEffect(()=>{ const map=mapRef.current; if(!map) return; try { map.invalidateSize(false); } catch(_){} Object.values(markersRef.current).forEach(m=> { try { map.removeLayer(m); } catch(_){} }); markersRef.current={}; const classification=(window.tennisSurfaceClassification||{}); const mapCategoryToColor=cat=>{ if(!cat) return 'unknown'; const c=(cat||'').toString(); if(c==='Red Plus Clay') return 'rp'; if(c==='Real Clay' || c==='Natural Clay') return 'rc'; if(c==='Artificial Clay') return 'sc'; if(c==='Real Grass' || c==='Natural Grass') return 'ng'; if(c.startsWith('Artificial Grass')) return 'sg'; if(c==='Hard Court' || c==='Hardcourt') return 'hc'; return 'unknown'; }; const UI_TO_INTERNAL={ 'Hardcourt':'Hard Court' }; const requestedSurface=surfaceFilter ? (UI_TO_INTERNAL[surfaceFilter]||surfaceFilter):null; const surfaceColorClass=club=>{ const clubId=club.id; const cats=(classification[clubId]||[]).map(x=> (x||'').toString()); if(requestedSurface){ return mapCategoryToColor(requestedSurface); } if(!cats.length) return 'unknown'; if(cats.includes('Red Plus Clay')) return 'rp'; if(cats.includes('Real Clay')||cats.includes('Natural Clay')) return 'rc'; if(cats.includes('Artificial Clay')) return 'sc'; if(cats.includes('Real Grass')||cats.includes('Natural Grass')) return 'ng'; if(cats.includes('Artificial Grass (Savannah)')||cats.includes('Artificial Grass (TigerTurf)')||cats.includes('Artificial Grass')) return 'sg'; if(cats.includes('Hard Court')||cats.includes('Hardcourt')) return 'hc'; return 'unknown'; };
  // Build markers for current filteredClubs
  const newMarkers = [];
  const normAsset = (u) => { try { const s=(u||'').toString().trim(); if(!s) return ''; if (s.startsWith('data:') || /^([a-z]+:)?\/\//i.test(s) || s.startsWith('/')) return s; if (s.startsWith('images/') || s.startsWith('logos/') || s.startsWith('assets/') || s.startsWith('img/')) return '/'+s.replace(/^\/+/,''); return s; } catch{ return u||'' } };
  filteredClubs.forEach(club => {
    if (!club || typeof club.lat !== 'number' || typeof club.lng !== 'number') return;
    const color = surfaceColorClass(club);
    const iconHtml = `<div class="surface-marker${selectedClubId===club.id?' selected':''}"><div class="marker-shell ${color}"></div></div>`;
    const icon = L.divIcon({ html: iconHtml, className: '', iconSize: [26,26], iconAnchor: [13,13] });
    const marker = L.marker([club.lat, club.lng], { icon });
  // Popup content styled like cards (bigger logo + details)
    let hostName = '';
    if (club.website) {
      const raw = club.website.toString().trim();
      try { hostName = new URL(raw).hostname.replace(/^www\./,''); } catch(_) {
        try { hostName = raw.replace(/^https?:\/\//,'').split('/')[0].replace(/^www\./,''); } catch(_){}
      }
    }
  const customFav = normAsset((club.favicon || club.favicon_url || club.icon || club.logo || ''));
  const derivedFav = hostName ? `https://${hostName}/favicon.ico` : '';
  const imgSrc = customFav || derivedFav;
    const detailsBits = [];
    if (club.courts) {
      detailsBits.push(`
        <div class=\"flex items-center gap-1.5\" title=\"${club.courts} courts\"> 
          <svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"1\"></rect><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"></line><line x1=\"8\" y1=\"5\" x2=\"8\" y2=\"19\" stroke-width=\"1\"></line><line x1=\"16\" y1=\"5\" x2=\"16\" y2=\"19\" stroke-width=\"1\"></line><line x1=\"3\" y1=\"12\" x2=\"21\" y2=\"12\" stroke-width=\"1\"></line></svg>
          <span class=\"text-[12px] font-medium text-slate-700\">${club.courts} Courts</span>
        </div>`);
    }
    if (club.court_surface) {
      detailsBits.push(`
        <div class=\"flex items-center gap-1.5\" title=\"Court Surface\"> 
          <svg viewBox=\"0 0 22 22\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"#94a3b8\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 8c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0\"></path><path d=\"M4 12c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0\"></path><path d=\"M4 16c1-.8 2-.8 3 0s2 .8 3 0 2-.8 3 0 2 .8 3 0 2-.8 3 0\"></path></svg>
          <span class=\"text-[12px] font-medium text-slate-700\">${(club.court_surface||'').toString().trim()}</span>
        </div>`);
    }
    (function(){
      const ctRaw = (club.court_type && club.court_type.toString().trim()) || '';
      const ct = ctRaw.toLowerCase();
      let icon = '';
      let label = '';
      if (ct === 'outdoor' || (!ct && club.indoor === false) || ct.includes('outdoor')) {
        icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94a3b8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M36 0V1V8V9H38V8V1V0H36ZM11.5312 10.125L10.125 11.5312L10.8438 12.25L15.7812 17.1875L16.5 17.9062L17.9062 16.4687L17.1875 15.7812L12.25 10.8125L11.5312 10.125ZM62.4688 10.125L61.75 10.8125L56.8125 15.7812L56.0938 16.4687L57.5 17.9062L58.2188 17.1875L63.1562 12.25L63.875 11.5312L62.4688 10.125ZM37 16C25.414 16 16.0001 25.4139 16 37C16.0001 48.5861 25.414 58 37 58C48.5861 58 58.0001 48.5861 58 37C58.0001 25.4139 48.5861 16 37 16ZM37 18C47.5053 18 56.0001 26.4948 56 37C56.0001 47.5052 47.5053 56 37 56C26.4948 56 18.0001 47.5052 18 37C18.0001 26.4948 26.4948 18 37 18ZM0 36V38H1H8H9V36H8H1H0ZM65 36V38H66H73H74V36H73H66H65ZM16.5 56.0937L15.7812 56.7812L10.8438 61.75L10.125 62.4375L11.5312 63.8438L12.25 63.1562L17.1875 58.1875L17.9062 57.5L16.5 56.0937ZM57.5 56.0937L56.0938 57.5L56.8125 58.1875L61.75 63.1562L62.4688 63.8438L63.875 62.4375L63.1562 61.75L58.2188 56.7812L57.5 56.0937ZM36 65V66V73V74H38V73V66V65H36Z" transform="scale(0.2943243243)" />';
        label = ctRaw ? ctRaw : 'Outdoor';
      } else if (ct === 'indoor' || ct === 'indoor/outdoor' || (ct.includes('indoor') && ct.includes('outdoor')) || club.indoor === true || ct.includes('indoor')) {
        icon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 L12 4 L21 11"/><path d="M5 11v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8"/><rect x="10" y="14" width="4" height="5" rx="0.5" fill="none"/><line x1="12" y1="14" x2="12" y2="19"/></svg>';
        label = ctRaw ? ctRaw : 'Indoor';
      }
      if (icon) {
        detailsBits.push(`<div class=\"flex items-center gap-1.5\" title=\"Indoor / Outdoor\">${icon}<span class=\"text-[12px] font-medium text-slate-700\">${label}</span></div>`);
      }
    })();
    const detailsHtmlInner = detailsBits.length ? `<div class=\"mt-3 flex flex-wrap gap-x-4 gap-y-2 text-slate-600\">${detailsBits.join('')}</div>` : '';
    const directionsHtml = (typeof club.lat === 'number' && typeof club.lng === 'number')
      ? `<div class=\"mt-3 flex justify-end\"><a href=\"https://www.google.com/maps/search/?api=1&query=${club.lat},${club.lng}\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-md bg-teal-500 text-white hover:bg-teal-600\" style=\"color:#fff !important; background:#14b8a6; text-decoration:none; padding:6px 12px; border-radius:6px; font-weight:600; font-size:12px;\">Get directions</a></div>`
      : '';
    const popupHtml = `
      <div class=\"p-2\">
        <div class=\"flex items-start gap-4\"> 
          <img src=\"${imgSrc}\" alt=\"logo\" width=\"96\" height=\"96\" class=\"h-24 w-24 rounded-md object-contain border border-slate-300 bg-white p-3\" style=\"width:96px;height:96px;padding:10px;\" onerror=\"this.onerror=null; this.style.display='none';\" />
          <div>
            <div class=\"font-heading font-semibold text-[16px] leading-tight text-slate-800 mb-2.5\">${club.name||''}</div>
            <div class=\"text-[13px] leading-snug text-slate-600 mt-1\">${club.address||''}</div>
            ${detailsHtmlInner}
            ${directionsHtml}
          </div>
        </div>
      </div>`;
    try { marker.bindPopup(popupHtml); } catch(_){}
    marker.on('click', () => { try { setSelectedClubId(club.id); } catch(_){} });
    try { marker.addTo(map); } catch(_){}
    markersRef.current[club.id] = marker;
    newMarkers.push(marker);
  });
if (newMarkers.length && !selectedClubId) {
  const group = new L.featureGroup(newMarkers);
  const bounds = group.getBounds();
  const isSmall = (typeof window !== 'undefined' && window.innerWidth < 768);
  const smallPaddingTL = L.point(8, 8);
  const smallPaddingBR = L.point(8, 8);
  const desktopPadding = L.point(16, 16);

  // Cap the fit/zoom to avoid requesting tiles beyond available coverage.
  // Use the map's maxZoom when available, but prefer a conservative cap (15)
  // so single-point fits don't zoom to an extreme level.
  const mapMaxZoom = (map && map.getMaxZoom) ? (map.getMaxZoom() || 17) : 17;
  const conservativeMax = Math.min(mapMaxZoom, 15);

  if (newMarkers.length === 1) {
    // Single marker: avoid fitBounds which can compute an infinite zoom for a
    // zero-area bounds. Center on the marker and set a moderate zoom level.
    try {
      const single = newMarkers[0];
      const latlng = (single && single.getLatLng) ? single.getLatLng() : bounds.getCenter();
      const desiredZoom = Math.min(conservativeMax, 14);
      map.setView(latlng, desiredZoom, { animate: false });
    } catch (_) {
      // Fallback to fitBounds if anything goes wrong
      try {
        map.fitBounds(bounds.pad(getMarkerFitPadDesktop()), { paddingTopLeft: desktopPadding, paddingBottomRight: desktopPadding, animate: false, maxZoom: conservativeMax });
      } catch (_) {}
    }
    didInitialFitRef.current = true;
  } else {
    // Multiple markers: fit bounds but cap the computed zoom to avoid overshoot.
    try {
      if (isSmall) {
        map.fitBounds(bounds, { paddingTopLeft: smallPaddingTL, paddingBottomRight: smallPaddingBR, animate: false, maxZoom: conservativeMax });
      } else {
        map.fitBounds(bounds.pad(getMarkerFitPadDesktop()), { paddingTopLeft: desktopPadding, paddingBottomRight: desktopPadding, animate: false, maxZoom: conservativeMax });
      }
    } catch (_) {
      // ignore failures from fitBounds
    }
    didInitialFitRef.current = true;
  }
}
  if(selectedClubId && markersRef.current[selectedClubId]){ setTimeout(()=>{ const m=markersRef.current[selectedClubId]; if(m){ m.openPopup(); } },60); }
  }, [filteredClubs, selectedClubId, surfaceFilter]);

    // Reflow the map when its container resizes (e.g., after fonts/layout settle)
    useEffect(()=>{
      const map = mapRef.current;
      const el = typeof document !== 'undefined' ? document.getElementById('map') : null;
      if(!map || !el || typeof ResizeObserver === 'undefined') return;
      let lastW = el.clientWidth, lastH = el.clientHeight;
      const ro = new ResizeObserver(() => {
        const w = el.clientWidth, h = el.clientHeight;
        if (w === lastW && h === lastH) return;
        lastW = w; lastH = h;
        try {
          const c = map.getCenter();
          const z = map.getZoom();
          map.invalidateSize(false);
          map.setView(c, z, { animate:false });
        } catch(_){ }
      });
      try { ro.observe(el); } catch(_){ }
      return ()=> { try { ro.disconnect(); } catch(_){ } };
    }, []);

  useEffect(()=>{ const map=mapRef.current; if(!map||!map._surfaceLegend) return; const container=map._surfaceLegend.getContainer(); if(activeSport!=='Tennis'){ container.style.display='none'; return; } container.style.display=''; const colorMap={ 'Artificial Clay':'#d97706', 'Natural Clay':'#b45309', 'Artificial Grass':'#16a34a', 'Natural Grass':'#84cc16', 'Hardcourt':'#0ea5e9' }; const rows=(surfacesSorted||CANONICAL_SURFACES).map(s=>`<div class="legend-row"><span class="swatch" style="background:${colorMap[s]||'#94a3b8'}"></span> ${s}</div>`).join(''); container.innerHTML=`<div class="legend-title">Tennis surfaces</div>${rows}`; }, [activeSport, surfacesSorted]);

  const handleClubSelect=(clubId, fromList=false)=>{ setSelectedClubId(clubId); if(window.innerWidth<768) setMobileFiltersOpen(false); const club=allClubsLocal.find(c=>c.id===clubId); if(club && club.lat && club.lng && mapRef.current){ mapRef.current.flyTo([club.lat, club.lng],14,{ animate:true, duration:1 }); } if(fromList && window.innerWidth<768) setMobileListVisible(false); };

  // Keep map centered and correctly sized when layout changes on small screens
  useEffect(()=>{
    const map = mapRef.current;
    if(!map) return;
    const isSmall = (typeof window !== 'undefined' && window.innerWidth < 768);
    if(!isSmall) return;
    const tick = () => {
      try {
        const c = map.getCenter();
        const z = map.getZoom();
        map.invalidateSize();
        // Preserve the perceived center/zoom after size change
        map.setView(c, z, { animate:false });
      } catch(_){ }
    };
    // slight delay lets CSS transitions settle
    const t = setTimeout(tick, 180);
    return ()=> clearTimeout(t);
  }, [isMobileListVisible, isTopHeaderHidden]);

  // Also adjust map sizing on window resize (especially orientation changes on iPhone)
  useEffect(()=>{
    const map = mapRef.current;
    if(!map) return;
    let raf = 0;
    const onResize = () => {
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = 0;
        try {
          const c = map.getCenter();
          const z = map.getZoom();
          map.invalidateSize();
          map.setView(c, z, { animate:false });
        } catch(_){ }
      });
    };
    window.addEventListener('resize', onResize);
    return ()=> { window.removeEventListener('resize', onResize); if(raf) cancelAnimationFrame(raf); };
  }, []);

  useEffect(()=> { if(!isSuggestModalOpen) return; const onKey=e=> { if(e.key==='Escape') setSuggestModalOpen(false); }; window.addEventListener('keydown', onKey); return ()=> window.removeEventListener('keydown', onKey); }, [isSuggestModalOpen]);

  const handleChange=e=> { const { name, value } = e.target; setForm(f=>({ ...f, [name]: value })); };
  const validateForm=()=> { const errs={}; // Simplified: require description (notes) and email only
    if(!form.notes || !form.notes.trim()) errs.notes='Description is required';
    if(!form.email || !form.email.trim()) errs.email='Email is required'; else { const re=/^[^\s@]+@[^\s@]+\.[^\s@]+$/; if(!re.test(form.email)) errs.email='Invalid email address'; }
    return errs; };
  const handleSubmit=async e=> {
    e.preventDefault();
    console.log('[suggest] submit clicked', form);
    // Optimistically mark submitting so user sees immediate feedback
    setIsSubmitting(true);
    const v = validateForm();
    setErrors(v);
    if (Object.keys(v).length) {
      const first = Object.keys(v)[0];
      requestAnimationFrame(()=>{
        const el = document.querySelector(`form[name='suggestClubForm'] [name='${first}']`);
        if (el) el.focus();
      });
      // stop submitting since validation failed
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    // Save locally for records (audit)
    try {
      const submissions = JSON.parse(localStorage.getItem('suggestedClubs')||'[]');
      submissions.push({ ...form, ts: Date.now() });
      localStorage.setItem('suggestedClubs', JSON.stringify(submissions));
    } catch (err) {}

    // Quick option: if a simple external endpoint is configured (e.g. Formsubmit.co or Formspree),
    // try posting form-encoded there first. This lets you receive suggestions without running
    // any server. Set `window.SIMPLE_SUGGEST_ENDPOINT = 'https://formsubmit.co/you@domain.tld'`
    // or `window.SIMPLE_SUGGEST_ENDPOINT = 'https://formspree.io/f/xxxxx'` in your page.
    try {
      const simpleUrl = (typeof window !== 'undefined' && window.SIMPLE_SUGGEST_ENDPOINT) ? window.SIMPLE_SUGGEST_ENDPOINT : null;
      if (simpleUrl) {
        try {
          console.log('[suggest] attempting simple external submit (form POST) to', simpleUrl);
          // Create a hidden form and submit it. This behaves like a normal browser form POST
          // (more reliable for services like Formsubmit.co than fetch with no-cors).
          const formEl = document.createElement('form');
          formEl.style.display = 'none';
          formEl.method = 'POST';
          formEl.action = simpleUrl;
          // Some services require no target so response replaces page; we keep same-window.
          Object.keys(form).forEach(k => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = form[k] || '';
            formEl.appendChild(input);
          });
          document.body.appendChild(formEl);
          // Submit the form. We can't inspect the response, but the POST will be sent.
          formEl.submit();
          // Show sent UI immediately
          setSuggestSubmitted(true);
          setTimeout(()=>{
            setSuggestModalOpen(false);
            setSuggestSubmitted(false);
            setForm({ name:'', sport:'Tennis', county:'', address:'', website:'', email:'', notes:'' });
            setErrors({});
            // Clean up form element after a short delay to avoid interrupting submission
            try { document.body.removeChild(formEl); } catch(_){}
          }, 1400);
          setIsSubmitting(false);
          return;
        } catch (errSimple) {
          console.warn('Simple external submit (form) failed, falling back to server POST', errSimple && errSimple.message);
        }
      }

  // POST to backend endpoint. Expect JSON { ok: true }
  const tryPost = async (url) => {
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!r.ok) {
          let json = null; try { json = await r.json(); } catch(_){}
          throw new Error((json && json.error) ? json.error : `Request failed (${r.status})`);
        }
        return r;
      };
      // First try relative path (works on Netlify or when API is proxied)
      try {
        await tryPost('/api/suggest-club');
      } catch (err) {
        // Fallback: try local dev server (common when static site served separately)
        console.warn('Relative POST failed, trying local dev server...', err && err.message);
        await tryPost('http://localhost:5173/api/suggest-club');
      }
      setSuggestSubmitted(true);
      setTimeout(()=>{
        setSuggestModalOpen(false);
        setSuggestSubmitted(false);
        setForm({ name:'', sport:'Tennis', county:'', address:'', website:'', email:'', notes:'' });
        setErrors({});
      }, 1400);
    } catch (err) {
      console.error('Failed to send suggestion', err);
      // Show error to user inline
      setErrors(prev => ({ ...prev, submit: err.message || 'Failed to send suggestion' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="h-screen w-screen flex flex-col bg-slate-100">
  <header ref={headerRef} className="flex-shrink-0 bg-white border-b border-slate-200 z-[150]">
          <div className="px-4 sm:px-6 lg:px-8">
            <div
              ref={logoRowRef}
        className={`flex items-center justify-between h-14 md:h-18 lg:h-20 ${ (isMobileListVisible && isTopHeaderHidden) ? 'md:opacity-100  md:pointer-events-auto overflow-hidden opacity-0 pointer-events-none' : 'overflow-hidden md:overflow-visible'}`}
              style={{
                maxHeight: (typeof window !== 'undefined' && window.innerWidth < 768)
                  ? ((isMobileListVisible && isTopHeaderHidden) ? 0 : logoRowHeight)
                  : undefined,
                opacity: (typeof window !== 'undefined' && window.innerWidth < 768)
                  ? ((isMobileListVisible && isTopHeaderHidden) ? 0 : 1)
                  : 1,
                transition: (typeof window !== 'undefined' && window.innerWidth < 768)
          ? 'max-height 300ms cubic-bezier(.22,1,.36,1), opacity 200ms ease-out'
                  : undefined,
                willChange: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'opacity' : undefined
              }}
            >
              <a href="/"><Logo variant="dark" className="-my-1, mt-2" /></a>
              <div className="hidden md:flex items-center">
                <div className="flex items-center gap-3">
                  <button onClick={()=> setSuggestModalOpen(true)} className="text-sm bg-teal-500 text-white font-medium py-2.5 px-5 rounded-md hover:bg-teal-600 transition">Suggest a club</button>
                </div>
              </div>
            </div>
            <div className="pb-4 pt-3 md:pt-2 flex flex-col md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-y-3">
                <div
                ref={tabsRowRef}
                className={`items-center mb-2 md:mb-0 pr-4 md:pr-0 pt-1 md:pt-0 flex overflow-visible`}
                style={{
                  // Keep tabs visible at all times; on mobile we preserve a fixed maxHeight for layout
                  maxHeight: (typeof window !== 'undefined' && window.innerWidth < 768) ? tabsRowHeight : undefined,
                  opacity: 1,
                  transition: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'max-height 300ms cubic-bezier(.22,1,.36,1)' : undefined,
                  willChange: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'max-height' : undefined
                }}
              >
                <div className="p-1 bg-slate-100 rounded-md flex space-x-0.5 md:space-x-0.5 flex-grow md:flex-grow-0" role="tablist" aria-label="Sports">
                  {['Tennis','Padel','Pickleball'].map((sport, idx, arr) => (
                    <button
                      key={sport}
                      ref={el => { if(el) tabRefs.current[sport] = el; }}
                      role="tab"
                      aria-selected={activeSport === sport}
                      tabIndex={activeSport === sport ? 0 : -1}
                      className={`w-full px-3 md:px-3 lg:px-6 xl:px-7 py-2 md:py-2 text-sm font-semibold rounded-md transition ${activeSport === sport ? 'bg-white text-teal-600 shadow-sm' : 'bg-transparent text-slate-600 hover:bg-white/60'}`}
                      onClick={()=> setActiveSport(sport)}
                      onKeyDown={(e)=>{
                        if(e.key==='ArrowRight' || e.key==='ArrowLeft'){
                          e.preventDefault();
                          const dir = e.key==='ArrowRight' ? 1 : -1;
                          const cur = arr.indexOf(activeSport);
                          const nextIdx = (cur + dir + arr.length) % arr.length;
                          const next = arr[nextIdx];
                          setActiveSport(next);
                          setTimeout(()=>{ try { tabRefs.current[next]?.focus(); } catch(_){} }, 0);
                        }
                      }}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
                {/* Removed mobile spacer to keep button inline with tabs */}
                <div className="flex items-center gap-2 w-full md:w-auto md:ml-0 mt-0 md:mt-0">
                  <button aria-label="Filters" onClick={()=> setMobileFiltersOpen(o=>!o)} className={`md:hidden relative h-10 px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-700 shadow-sm flex items-center justify-center min-w-[44px] ml-2 ${isMobileFiltersOpen ? 'ring-2 ring-teal-500/40' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-[18px] h-[18px]"><path fill="currentColor" fillRule="evenodd" d="M3.25 6A.75.75 0 0 1 4 5.25h16a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 3.25 6Zm3 6a.75.75 0 0 1 .75-.75h10a.75.75 0 0 1 0 1.5h-10A.75.75 0 0 1 6.25 12Zm3 5.25a.75.75 0 0 0 0 1.5h5a.75.75 0 0 0 0-1.5h-5Z" clipRule="evenodd"/></svg>
                    <span className="ml-2 text-sm font-medium">Filters</span>
                  </button>
                  <div className="hidden md:flex items-center gap-2 lg:gap-3 md:ml-2">
                    <select aria-label="County" value={countyFilter} onChange={e=> setCountyFilter(e.target.value)} className="w-full md:w-[150px] lg:w-[230px] xl:w-[230px] px-4 md:px-3 lg:px-4 xl:px-3 py-2.5 md:py-2 border border-slate-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 text-sm font-medium">
                      <option value="">All counties</option>
                      {getCountiesSafe().map(c => {
                        const n = countyCounts[c] || 0;
                        return <option key={c} value={c}>{c}{n?` (${n})`:''}</option>;
                      })}
                    </select>
                    {activeSport === 'Tennis' && (
                      <select aria-label="Surface" value={surfaceFilter} onChange={e=> setSurfaceFilter(e.target.value)} className="w-full md:w-[150px] lg:w-[230px] xl:w-[230px] px-4 md:px-3 lg:px-4 xl:px-3 py-2.5 md:py-2 border border-slate-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 text-sm font-medium">
                        <option value="">All surfaces</option>
                        {(surfacesSorted||CANONICAL_SURFACES).map(s => <option key={s} value={s}>{s}{` (${surfaceCounts[s]||0})`}</option>)}
                      </select>
                    )}
                    <select aria-label="Venue type" value={indoorFilter} onChange={e=> setIndoorFilter(e.target.value)} className="w-full md:w-[150px] lg:w-[230px] xl:w-[230px] px-4 md:px-3 lg:px-4 xl:px-3 py-2.5 md:py-2 border border-slate-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500 text-sm font-medium">
                      <option value="">All venue types</option>
                      <option value="outdoor">Outdoor</option>
                      <option value="indoor">Indoor</option>
                    </select>
                  </div>
                </div>
              </div>
              {isMobileFiltersOpen && (
                <div className="md:hidden">
                  {/* Backdrop (above list pane z-40) */}
                  <div className="fixed inset-0 z-[160] bg-black/35 backdrop-blur-[1px]" onClick={()=> setMobileFiltersOpen(false)} />
                  {/* Panel */}
                  <div ref={mobileFiltersPanelRef} role="dialog" aria-modal="true" aria-labelledby="mobile-filters-title" className="fixed inset-x-4 top-20 z-[170] bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xl max-h-[65vh] overflow-auto ring-1 ring-black/5">
                  <div className="flex items-center justify-between mb-1"><div id="mobile-filters-title" className="text-base font-semibold text-slate-800">Filters</div></div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">County</label>
                      <select ref={firstMobileFilterRef} value={countyFilter} onChange={e=> setCountyFilter(e.target.value)} className={`w-full px-4 ${mobileFilterPaddingClass()} border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50`}>
                        <option value="">All counties</option>
                        {getCountiesSafe().map(c => {
                          const n = countyCounts[c] || 0;
                          return <option key={c} value={c}>{c}{n?` (${n})`:''}</option>;
                        })}
                      </select>
                    </div>
                    {activeSport === 'Tennis' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Surface</label>
                        <select value={surfaceFilter} onChange={e=> setSurfaceFilter(e.target.value)} className={`w-full px-4 ${mobileFilterPaddingClass()} border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50`}>
                          <option value="">All surfaces</option>
                          {(surfacesSorted||CANONICAL_SURFACES).map(s => <option key={s} value={s}>{s}{` (${surfaceCounts[s]||0})`}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Venue type</label>
                      <select value={indoorFilter} onChange={e=> setIndoorFilter(e.target.value)} className={`w-full px-4 ${mobileFilterPaddingClass()} border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/50`}>
                        <option value="">All venue types</option>
                        <option value="outdoor">Outdoor</option>
                        <option value="indoor">Indoor</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button onClick={()=> { setCountyFilter(''); setSurfaceFilter(''); setIndoorFilter(''); setRawLocationSearch(''); }} className="text-sm font-semibold px-3.5 py-3 rounded-md border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200">Reset</button>
                    <button onClick={()=> { setMobileFiltersOpen(false); if (typeof window !== 'undefined' && window.innerWidth < 768 && isMobileListVisible) { setTopHeaderHidden(false); try { if(listScrollRef.current){ listScrollRef.current.scrollTop = 0; } } catch(_){} } }} className="text-sm font-semibold px-4 py-3 rounded-md bg-teal-500 text-white hover:bg-teal-600">Done</button>
                  </div>
                  </div>
                </div>
              )}
                <div className="w-full md:max-w-xs lg:max-w-sm xl:max-w-md mt-2 md:mt-0">
                <div className="relative flex-grow">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="h-5 w-5 text-slate-400"/></div>
                  <input id="global-search" type="text" placeholder="Search by city or name..." value={rawLocationSearch} onChange={e=> setRawLocationSearch(e.target.value)} className={`block w-full pl-10 pr-10 ${mobileSearchPaddingClass()} md:py-1.5 border border-slate-300 rounded-lg leading-6 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 text-base`} />
                  {rawLocationSearch && rawLocationSearch.trim() && (
                    <button type="button" aria-label="Clear search" onClick={()=> { setRawLocationSearch(''); setTimeout(()=>{ try { document.getElementById('global-search')?.focus(); } catch(e){} }, 0); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-grow flex relative overflow-hidden">
          <div className={`absolute md:relative top-0 bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMobileListVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-full md:w-[48%] lg:w-[40%] xl:w-[680px] 2xl:w-[710px] flex-shrink-0 flex flex-col bg-white border-r border-slate-200`}>
            <div className="px-4 sm:px-6 lg:px-8 py-3 md:py-4 flex-shrink-0 border-b border-slate-200 flex items-center justify-between gap-3 sticky top-0 z-20 bg-white shadow-md md:shadow-none">
              <p role="status" aria-live="polite" aria-atomic="true" className="text-sm md:text-base font-semibold text-slate-700">{filteredClubs.length} clubs</p>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={()=> setSortOrder(prev => prev === 'az' ? 'za' : 'az')}
                  aria-pressed={sortOrder === 'za'}
                  className="text-sm text-slate-600 hover:text-teal-700 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 rounded"
                  title={sortOrder === 'za' ? 'Z → A' : 'A → Z'}
                >
                  <span className="font-semibold">{sortOrder === 'za' ? 'Z → A' : 'A → Z'}</span>
                </button>
              </div>
              <button onClick={()=> setMobileListVisible(false)} aria-label="Close list" className="md:hidden text-slate-400 hover:text-slate-600 transition text-lg leading-none mr-2 px-3">✕</button>
            </div>
            <div ref={listScrollRef} className="relative flex-grow px-4 sm:px-6 lg:px-8 py-4 overflow-y-auto custom-scrollbar" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
              {/* Absolute sentinel: does not affect layout; hides header after a few cards */}
              <div ref={hideSentinelRef} aria-hidden="true" style={{ position:'absolute', top: sentinelOffset+'px', left: 0, width:'1px', height:'1px', pointerEvents:'none' }} />
              <div className="space-y-4">
                {filteredClubs.length > 0 ? (
                  <>
                    {filteredClubs.map((club, idx) => (
                      <ClubCard
                        key={club.id}
                        club={club}
                        isSelected={selectedClubId === club.id}
                        priority={idx < 12}
                        onClick={() => { handleClubSelect(club.id, true); }}
                        animateOnLoad={!didInitialListAnimate}
                        appearDelay={Math.min(idx, 12) * 35}
                      />
                    ))}
                  </>
                ) : (
                  <div className="text-center p-8 text-slate-500">
                    <h3 className="font-heading font-semibold text-lg">No clubs found</h3>
                    <p>Try adjusting your search filters.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
            <div className="flex-grow h-full relative">
            <div id="map" className="h-full w-full z-10"></div>
            {/* Mobile-only single-action opener: show the list. Hidden while the list is visible. */}
              {!isMobileListVisible && (
              <div className="md:hidden absolute top-4 left-4 z-50 pointer-events-auto">
                <button
                  onClick={() => {
                    // Open the list (one-way action); the button will then be hidden
                    setMobileListVisible(true);
                    try {
                      setTopHeaderHidden(false);
                      if (listScrollRef.current) listScrollRef.current.scrollTop = 0;
                    } catch (_) {}
                  }}
                  aria-label="Show list"
                  className="pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 text-slate-800 font-semibold py-3.5 px-6 rounded-full shadow-lg ring-1 ring-slate-200 hover:bg-white transition text-base"
                >
                  <ListIcon className="h-6 w-6"/>
                  <span className="text-base font-medium">Show list</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      <SuggestClubModal open={isSuggestModalOpen} onClose={()=> setSuggestModalOpen(false)} submitted={suggestSubmitted} form={form} errors={errors} isSubmitting={isSubmitting} onChange={handleChange} onSubmit={handleSubmit} />
    </>
  );
}

function App(){ return <ClubFinder />; }

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
requestAnimationFrame(()=> container.classList.add('page-loaded'));
document.addEventListener('click', (e)=> { const a = e.target.closest('a'); if(!a) return; const href = a.getAttribute('href'); if(!href || href.startsWith('http') || href.startsWith('#') || a.target === '_blank') return; if(href.endsWith('.html')){ e.preventDefault(); container.classList.remove('page-loaded'); container.classList.add('page-fade-out'); setTimeout(()=> { window.location.href = href; }, 180); } });

// Progressive image hydration: swap from low priority to high once scrolled into view
// (mainly benefits when many logos present). Already using loading/fetchpriority hints.
try {
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(en => {
      if(!en.isIntersecting) return;
      const img = en.target;
      if(img.tagName === 'IMG' && img.loading === 'lazy'){
        // Force fetch sooner by toggling decoding hint if still pending
        img.decoding = 'sync';
      }
      obs.unobserve(img);
    });
  }, { rootMargin: '150px 0px' });
  document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelectorAll('img[loading="lazy"]').forEach(img => obs.observe(img));
  });
} catch(e){}
