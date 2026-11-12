'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Rituel retains stock ownership and installs Garage UI',()=>{
 const link=read('rituel-garage.js'),trousse=read('trousse.js'),html=read('index.html');
 assert.match(link,/rituel\.catalog\.v1/);
 assert.match(link,/garage\.locations\.v1/);
 assert.match(link,/rituel\.location\.request\.v1/);
 assert.match(link,/garage_catalog|rituel_catalog/);
 assert.match(trousse,/trousse-garage-panel/);
 assert.match(trousse,/window\.RituelGarage\?\.decorate/);
 assert.match(html,/rituel-garage\.js\?v=1\.10\.0/);
 assert.ok(!link.slice(link.indexOf('function catalogPages'),link.indexOf('async function sendCatalog')).includes('stockEntry('));
});
test('PWA source & isolated Worker serve the same Garage module',()=>{
 assert.match(read('sw.js'),/rituel-v1\.10\.0/);
 assert.match(read('sw.js'),/rituel-garage\.js/);
 assert.match(read('edge-web/worker.js'),/rituel-garage\.js/);
 assert.match(read('link-core.js'),/'garage'/);
});
