'use strict';
// Generate a single-file bootstrap: upload update.html once from a phone.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
let html=fs.readFileSync(path.join(root,'update/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'update/update.css'),'utf8'),zip=fs.readFileSync(path.join(root,'update/vendor/jszip.min.js'),'utf8'),js=fs.readFileSync(path.join(root,'update/update.js'),'utf8');
html=html.replace('<html lang="zh-Hant">','<html lang="zh-Hant" data-site-root="./">').replace(/<link rel="stylesheet"[^>]+>/,'<style>'+css+'</style>').replace(/<script defer src="[^"]+"><\/script>/g,'').replace('href="../admin/"','href="./admin/index.html"').replace('href="../"','href="./"').replace('</body>',()=>'<script>'+zip.replace(/<\/script/gi,'<\\/script')+'</script><script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>');
const out=path.join(root,'update.html');if(process.argv.includes('--check')){if(!fs.existsSync(out)||fs.readFileSync(out,'utf8')!==html)throw Error('Run node scripts/build-updater.cjs');}else fs.writeFileSync(out,html);console.log('Single-file updater verified');
