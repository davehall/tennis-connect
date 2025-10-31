# GitHub Copilot Instructions for Tennis Club Connect

A static React + Leaflet app bundled with esbuild and served from `app/`. Data and images live under `app/assets/` and `app/images/`. This guide sets the rules and workflows for AI-assisted edits to keep the site fast, safe, and maintainable.

## Architecture
- UI: React 18 functional components in `app/src/app.jsx`, bundled to `app/app.js` (IIFE, minified, ES2018 target).
- Map: Leaflet for markers, popups, and bounds fitting.
- Styling: Tailwind utility classes in JSX. No custom CSS build.
- Data: Base64 JSON (`app/assets/data/rk7a9nq3.b64.txt`) loaded by `rk7a9nq3.js` hydrates global data at runtime.
- Images: All logos/icons are local for privacy. No runtime remote favicon fetching.
- SW: `app/sw.js` caches the shell and images. Bump cache version on asset changes.
- Optional backend: Netlify function `netlify/functions/suggest-club.js` and local Express helper `app/server/send-suggestion.js` for suggestions.

## Golden rules
- Edit source only: Make changes in `app/src/app.jsx`. Never edit the compiled bundle `app/app.js` directly.
- Keep it small: Favor light, incremental changes. Preserve public behavior unless the task requires it.
- Mobile-first: Ensure inputs/buttons remain touch-friendly. On iOS small screens, popover filter inputs can be slightly taller.
- Privacy first: Don’t add third-party trackers or external data fetches. Keep all assets local unless explicitly requested.
- Determinism: Avoid non-deterministic behavior (no time-based randomization). Prefer predictable outputs.

## Build and run
- Install: `npm install` (esbuild + React only)
- Build: `npm run build` (bundles `src/app.jsx` into `app.js`)
- Dev server: `npm start` then open `http://localhost:3000/search/` or `search/index.html` depending on workspace
- Do NOT introduce new build tools unless requested. Stick with esbuild.

## Data workflows
- Editing clubs: Update the base64 file `app/assets/data/rk7a9nq3.b64.txt` directly or regenerate from legacy `clubs.js` via `node app/scripts/extract-b64.js`.
- Audits:
  - Logos: `npm run audit:logos` to report missing/unused logos.
  - Images: `npm run audit:images` to find large files and compression candidates.
- Sorting: Dataset loads with a one-time alphabetical sort; still add entries in alphabetical order where practical to keep diffs small.
- No rebuild needed for pure data edits. Rebuild only when `src/` changes.

## UI conventions
- Tailwind classes for spacing/typography. Keep vertical paddings sensible:
  - Global search input: compact by default (e.g., `py-2 md:py-1.5`).
  - Mobile filter popover (iOS small screens): allow slightly taller inputs for better touch targets.
- Accessibility: Ensure labels, roles, focus management, and alt text are present. Don’t rely on color alone.
- Performance: Re-create markers only when filters change. Avoid heavy re-renders.

## Map and tiles
- Use OSM/CARTO by default. If `MAPTILER_KEY` is set in `app/config.js`, use MapTiler with `MAPTILER_STYLE`.
- Don’t ship secrets. Keep keys empty in committed files.

## Service worker
- If you change static assets, bump the cache name in `app/sw.js` (e.g., `tcm-assets-v3` → `tcm-assets-v4`) and verify `install/activate` handlers update caches.

## Netlify function (optional)
- `netlify/functions/suggest-club.js`: Validates and forwards suggestion emails. Keep strict input validation and rate limiting where added.

## PR scope & checklist
- Narrow, well-described changes. Include why and user impact.
- Source changes only in `app/src/app.jsx` unless adjusting data or images.
- Build locally: `npm run build` and confirm `app/app.js` updates reflect your source changes.
- Test locally: open search page; verify filters, map markers, and popovers work.
- If assets changed, update SW cache version.
- Run audits when touching images/logos.
- No unrelated refactors or formatting churn.

## Don’ts
- Don’t edit `app/app.js` directly.
- Don’t add new dependencies or heavy frameworks without explicit approval.
- Don’t fetch external favicons or third-party APIs at runtime.
- Don’t degrade mobile touch targets or accessibility.

## Common pitfalls
- Forgetting to rebuild after changing `src/`.
- Modifying minified bundle instead of source.
- Breaking small-screen layouts; always check iOS touch targets.
- Changing dataset without updating local logos/images.

## Quick references
- Source: `app/src/app.jsx`
- Bundle: `app/app.js` (generated)
- Search page: `app/search/index.html`
- Landing page: `app/index.html`
- Data: `app/assets/data/`
- Images: `app/images/`
- Components: `app/components.js`
- SW: `app/sw.js`
- Scripts: `app/scripts/`
- Netlify functions: `netlify/functions/`

---
If you need broader architectural changes or a new feature, propose a brief plan in the PR description before implementation. Keep performance and privacy top-of-mind.
