#!/usr/bin/env node
/**
 * update-club.js
 * Update one or more fields for a specific club in the dataset.
 *
 * Examples:
 *   node scripts/update-club.js --id 123 --courts 6
 *   node scripts/update-club.js --name "Arklow" --courts 4 --floodlit true
 *   node scripts/update-club.js --name "Tralee" --indoor false --court_surface "Artificial Grass"
 *
 * Works directly on assets/data/rk7a9nq3.b64.txt and creates a timestamped backup.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const B64_FILE = path.join(ROOT, 'assets', 'data', 'rk7a9nq3.b64.txt');

function ts(){
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return [d.getFullYear(), pad(d.getMonth()+1), pad(d.getDate())].join('') + '-' + [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('');
}

function parseArgs(argv){
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i+1];
      if (typeof next === 'undefined' || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function coerce(val){
  if (val === undefined) return val;
  const s = String(val).trim();
  if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return val;
}

function loadData(){
  if (!fs.existsSync(B64_FILE)) {
    throw new Error('Dataset not found: ' + path.relative(ROOT, B64_FILE));
  }
  const b64 = (fs.readFileSync(B64_FILE, 'utf8') || '').trim();
  if (!b64) throw new Error('Dataset file is empty');
  const jsonStr = Buffer.from(b64, 'base64').toString('utf8');
  const data = JSON.parse(jsonStr);
  if (!Array.isArray(data)) throw new Error('Expected array dataset');
  return data;
}

function saveData(data){
  const backup = B64_FILE.replace(/\.b64\.txt$/, `.backup-${ts()}.b64.txt`);
  fs.copyFileSync(B64_FILE, backup);
  const b64 = Buffer.from(JSON.stringify(data), 'utf8').toString('base64');
  fs.writeFileSync(B64_FILE, b64 + '\n', 'utf8');
  return backup;
}

function matchClub(c, args){
  if (args.id !== undefined) {
    const idNum = Number(args.id);
    if (!Number.isNaN(idNum)) return Number(c.id) === idNum;
  }
  if (args.name) {
    const q = String(args.name).toLowerCase();
    return (c.name || '').toString().toLowerCase().includes(q);
  }
  return false;
}

function main(){
  const args = parseArgs(process.argv);
  if (!args.id && !args.name) {
    console.error('Please specify a target club with --id <number> or --name "partial"');
    process.exit(1);
  }
  // Collect fields to update
  const updatable = ['courts','floodlit','indoor','court_surface','court_type','website','logo','favicon','favicon_url','address','notes','county','sport'];
  const updates = {};
  updatable.forEach(k => { if (k in args) updates[k] = coerce(args[k]); });
  if (!Object.keys(updates).length) {
    console.error('No updates specified. Provide one or more of:', updatable.join(', '));
    process.exit(1);
  }

  let data;
  try { data = loadData(); } catch (e) { console.error(e.message); process.exit(2); }

  const matches = data.filter(c => matchClub(c, args));
  if (!matches.length) {
    console.error('No club matched criteria. Try refining --name or use --id');
    process.exit(1);
  }
  if (matches.length > 1 && !args.id) {
    console.error('Multiple clubs matched --name. Please specify --id. Matches:');
    matches.slice(0, 10).forEach(c => console.error(' -', c.id, c.name));
    if (matches.length > 10) console.error(` ...and ${matches.length - 10} more`);
    process.exit(1);
  }
  const target = matches[0];
  const before = JSON.parse(JSON.stringify(target));
  Object.keys(updates).forEach(k => { target[k] = updates[k]; });

  const backup = saveData(data);
  console.log('Updated club:', target.id, '-', target.name);
  Object.keys(updates).forEach(k => console.log(`  ${k}:`, before[k], '=>', target[k]));
  console.log('Backup saved to', path.relative(ROOT, backup));
}

main();
