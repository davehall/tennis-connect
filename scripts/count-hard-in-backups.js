const fs = require('fs');
const path = require('path');

function countHardFromJson(json) {
  let venues = 0, courts = 0;
  json.forEach(c => {
    const s = ((c.court_surface || '') + '').toLowerCase();
    if (s.includes('hard')) { venues++; courts += Number(c.courts) || 0; }
  });
  return { venues, courts };
}

const dataDir = path.join(__dirname, '..', 'app', 'assets', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.startsWith('rk7a9nq3') && f.includes('backup') || f === 'rk7a9nq3.b64.txt');
// also include backups folder
const backupsDir = path.join(dataDir, 'backups');
let extra = [];
try { extra = fs.readdirSync(backupsDir).filter(f => f.startsWith('rk7a9nq3') && f.includes('backup') ); } catch(e) {}
const all = files.concat(extra.map(f => path.join('backups', f))).sort();
// include current clubs.json
all.unshift('clubs.json');

console.log('file,venues,courts');
all.forEach(file => {
  const fp = path.join(dataDir, file);
  try {
    let content = fs.readFileSync(fp, 'utf8').trim();
    let json = null;
    if (file.endsWith('.b64.txt') || file.includes('.b64')) {
      // decode base64
      const b = Buffer.from(content, 'base64').toString('utf8');
      json = JSON.parse(b);
    } else {
      json = JSON.parse(content);
    }
    const { venues, courts } = countHardFromJson(json);
    console.log(`${file},${venues},${courts}`);
  } catch (e) {
    console.log(`${file},ERR,${e.message.replace(/\n/g,' ')}'`);
  }
});
