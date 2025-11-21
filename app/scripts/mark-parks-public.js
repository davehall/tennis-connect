const fs = require('fs');
const p = 'assets/data/clubs.json';
const data = fs.readFileSync(p, 'utf8');
let j = JSON.parse(data);
let changed = false;
j.forEach(o => {
  try {
    if (o.favicon && o.favicon.includes('parks_tennis.png')) {
      if (!o.public) { o.public = true; changed = true; }
    }
  } catch (e) {}
});
if (changed) {
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n', 'utf8');
  console.log('Updated clubs.json — set public=true for parks_tennis entries');
} else {
  console.log('No changes needed');
}
