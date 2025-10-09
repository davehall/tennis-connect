#!/usr/bin/env node
/*
  audit-images.js
  Reports size statistics for images/logos directory.
  - Total files / cumulative size
  - Top 15 largest assets
  - Extension distribution

  Usage: node scripts/audit-images.js
*/
const fs = require('fs');
const path = require('path');

const LOGO_DIR = path.join(__dirname, '..', 'images', 'logos');

function human(bytes){
  if(bytes < 1024) return bytes + ' B';
  const units=['KB','MB','GB'];
  let i=-1; let v=bytes; do { v/=1024; i++; } while(v>=1024 && i<units.length-1);
  return v.toFixed(v>=100?0: v>=10?1:2) + ' ' + units[i];
}

function main(){
  if(!fs.existsSync(LOGO_DIR)){
    console.error('logos directory missing');
    process.exit(1);
  }
  const files = fs.readdirSync(LOGO_DIR).filter(f => !f.startsWith('.'));
  const entries = files.map(f => {
    const p = path.join(LOGO_DIR, f);
    const stat = fs.statSync(p);
    return { file: f, size: stat.size, ext: path.extname(f).toLowerCase() || 'none' };
  });
  const totalSize = entries.reduce((a,b)=> a + b.size, 0);
  const extCounts = entries.reduce((acc,e)=>{ acc[e.ext] = (acc[e.ext]||0) + 1; return acc; }, {});
  const extSizes = entries.reduce((acc,e)=>{ acc[e.ext] = (acc[e.ext]||0) + e.size; return acc; }, {});
  console.log('\nImage Size Report');
  console.log('=================');
  console.log('Files:', entries.length);
  console.log('Total size:', human(totalSize));
  console.log('\nBy extension:');
  Object.keys(extCounts).sort().forEach(ext => {
    console.log(`  ${ext.padEnd(6)} ${String(extCounts[ext]).padStart(4)}  ${human(extSizes[ext]).padStart(10)}`);
  });
  console.log('\nTop 15 largest:');
  entries.sort((a,b)=> b.size - a.size).slice(0,15).forEach(e => {
    console.log('  ' + e.file.padEnd(40) + human(e.size));
  });
  const overs = entries.filter(e => e.size > 60 * 1024);
  if(overs.length){
    console.log('\nRecommendations:');
    overs.forEach(e => console.log('  Consider compressing -> ' + e.file + ' (' + human(e.size) + ')'));
  }
  console.log('\nDone.');
}

main();
