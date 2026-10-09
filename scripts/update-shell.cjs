'use strict';
// Run after changing a startup file: node scripts/update-shell.cjs
// For each release, also bump CACHE_NAME in sw.js and app.js's ?v= in index.html.
// CI can verify the pinned complete release with node scripts/update-shell.cjs --check.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const paths=['index.html',
  ...[...html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"/g)].map(m=>m[1]),
  ...[...html.matchAll(/<script defer src="\.\/([^"]+)"/g)].map(m=>m[1]),
  'manifest.json','icons/icon-192x192.png','icons/icon-512x512.png','icons/icon-apple.png'];
const entries=paths.map(asset=>({path:asset,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,asset.split('?')[0]))).digest('hex')}));
const sw=path.join(root,'sw.js'),source=fs.readFileSync(sw,'utf8');
const ledger=/const CORE_SHELL = \[[\s\S]*?\];/;
if(!ledger.test(source))throw Error('Missing startup release manifest in sw.js');
const next=source.replace(ledger,'const CORE_SHELL = '+JSON.stringify(entries,null,2)+';');
if(process.argv.includes('--check')){
  if(next!==source)throw Error('Startup files changed: run node scripts/update-shell.cjs before deployment.');
}else if(next!==source){fs.writeFileSync(sw,next);}
console.log('Complete startup release verified: '+entries.length+' files');
