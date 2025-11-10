const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'assets', 'data', 'clubs.json');
const clubs = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const t = clubs
  .filter(c => c.sport === 'Tennis')
  .sort((a, b) => (b.courts || 0) - (a.courts || 0) || (a.name || '').localeCompare(b.name || ''))
  .slice(0, 20);

function esc(s){ return (s||'').toString().replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let out = [];
out.push('<div id="top-20-clubs" class="py-14 bg-white border-t border-slate-200">');
out.push('  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">');
out.push('    <h2 class="text-3xl font-extrabold text-slate-900 mb-4 font-heading">Top 20 tennis clubs</h2>');
out.push('    <p class="text-sm text-slate-600 mb-4">Curated by number of courts — name (county) • courts.</p>');
out.push('    <ol class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">');

for(const c of t){
  const name = esc(c.name);
  const county = esc(c.county || '');
  const courts = c.courts || '?';
  const url = '/search/?query=' + encodeURIComponent(c.name || '');
  out.push(`      <li class="p-4 bg-slate-50 rounded-md border"> <a href="${url}" class="font-semibold text-slate-900">${name}</a> <div class="text-sm text-slate-600 mt-1">${county} • ${courts} courts</div> </li>`);
}

out.push('    </ol>');
out.push('    <div class="mt-6">');
out.push('      <a href="/search/" class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-teal-600 text-white">Browse all clubs</a>');
out.push('    </div>');
out.push('  </div>');
out.push('</div>');

console.log(out.join('\n'));
