const { execSync } = require('child_process');
const fs = require('fs');
if (process.argv.length < 3) {
  console.error('Usage: node count-hard-by-commit.js <commit> [path]');
  process.exit(2);
}
const rev = process.argv[2];
const path = process.argv[3] || 'app/assets/data/clubs.json';
try {
  const out = execSync(`git show ${rev}:${path}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'inherit'] });
  const data = JSON.parse(out);
  let venues = 0;
  let courts = 0;
  data.forEach(c => {
    const s = ((c.court_surface || '') + '').toLowerCase();
    if (s.includes('hard')) {
      venues++;
      courts += Number(c.courts) || 0;
    }
  });
  console.log(JSON.stringify({ rev, venues, courts }));
} catch (err) {
  console.error('ERR', err.message);
  process.exit(3);
}
