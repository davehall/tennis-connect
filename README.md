# Tennis Club Map

A fast, privacy‑respecting static web app for exploring Tennis, Padel & Pickleball clubs across Ireland. Built with a lightweight React + Leaflet front end, bundled via esbuild into a single script (`app.js`) and served as static assets (no server runtime required).

## Key Features
- 200+ curated clubs (Tennis, Padel, Pickleball) with surfaces, court counts, indoor/outdoor, floodlighting
- Powerful client‑side filtering & instant search
- Interactive Leaflet map with surface‑based colour markers & accessible popups
- Local-only logos / icons (no runtime remote favicon fetching) for privacy and determinism
- Resilient multi‑stage thumbnail fallback (preview -> club favicon -> branded fallback -> inline SVG)
- Offline-friendly: service worker caches core shell + images
- Suggest‑a‑club modal with localStorage fallback and optional backend hook

## Project Structure
```
index.html        Landing page (marketing + CTA)
search.html       Main finder UI (loads React bundle)
assets/data/rk7a9nq3.js  Obfuscated data loader (hydrates window.* from base64)
assets/data/rk7a9nq3.b64.txt  Base64 JSON of curated dataset
components.js     Inline SVG/icon components exposed globally
src/app.jsx       React application source (bundled to app.js)
app.js            Built bundle (DO NOT EDIT directly)
sw.js             Service worker (image & shell cache)
images/           Logos, hero images, previews
```

## Development
Install dependencies (only esbuild + react libs):
```
npm install
```
Build once:
```
npm run build
```
Start a local static server on :3000 (builds first):
```
npm start
```
Then open http://localhost:3000/search.html

## Deployment
Because everything is static you can deploy the root directory to:
- GitHub Pages
- Netlify / Vercel (static)
- S3 + CloudFront
- Any Nginx/Apache static host

Minimum needed files: `index.html`, `search.html`, `app.js`, `assets/data/rk7a9nq3.js`, `components.js`, `sw.js`, and the `images/` directory. The raw `clubs.js` file is no longer referenced at runtime.

### Cache Busting & SW
The service worker currently uses cache name `tcm-assets-v3`. When you change static assets, bump the version string so users receive the updated assets and old caches are purged automatically in the `activate` handler.

### Updating Data
Edit the dataset via `assets/data/rk7a9nq3.b64.txt` (base64-encoded JSON array). For convenience during editing, you can regenerate it from the legacy `clubs.js` file using `node scripts/extract-b64.js`. A one-time alphabetical sort executes at load for predictable ordering, but please still add new entries in roughly alphabetical order to keep diffs small. Run the audit scripts below to validate assets. Rebuild only if you changed React source (`src/`). Pure data edits do not require rebundling.

## Accessibility
- All interactive elements have discernible labels
- Popups and modals use semantic roles and focus handling (Esc to close Suggest modal)
- Colour is never the sole surface indicator (legend text included)
- Images have alt text or are marked decorative where appropriate

## Performance Notes
- Single esbuild bundle (minified, target ES2018)
- No runtime favicon/network scraping (predictable, faster First Paint)
- Deferred map interaction: markers recreated only on filtered set changes
- Lightweight inline SVG placeholder prevents layout shift on missing images

Potential future optimisations:
- Marker clustering (Leaflet.markercluster) if dataset grows large
- Split marketing (landing) JS from finder bundle if size becomes critical
- Convert large JPEG/PNG logos to WebP/AVIF (see Image Report below)

## Data Hygiene Scripts
Logo reference auditor:
```
npm run audit:logos
```
Outputs missing referenced logo files and unused logo files on disk.

Image size / optimisation report:
```
npm run audit:images
```
Lists extension distribution, largest files, and >60KB compression candidates.

## Image Optimisation
Run `npm run audit:images` to view largest assets. Converting heavy PNG/JPG images to WebP/AVIF (while keeping fallbacks) and capping dimensions (e.g. 128x128 for square icons) will reduce transfer size.

## Security Headers (Recommended)
Configure your host (example Nginx) with:
```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://{s}.tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://unpkg.com; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self' mailto:;
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
X-Content-Type-Options: nosniff
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```
Tighten further by self-hosting Tailwind & Leaflet to eliminate external script/style allowances.

## Contributing
Data corrections or new club suggestions are welcome—submit an issue or PR. Please include source links (official club website) and verify coordinates.

## License
MIT

---
Generated README (initial). You can expand with changelog or data sourcing details as needed.
