'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Rituel ne retourne jamais automatiquement vers le relais historique',()=>{
 const app=src('rituel-nexus.js'),from=app.indexOf(' function queue(){'),to=app.indexOf(' async function test(){',from);
 assert.ok(from>=0&&to>from,'délimitation de la file automatique');
 const auto=app.slice(from,to);
 assert.match(auto,/await sendHub\(\{scopes:link\.pair\.scopes,quiet:true\}\)/);
 assert.doesNotMatch(auto,/await send\(/,'ancien relais interdit en automatique');
 assert.match(app,/data-r-link="send"/,'action manuelle historique conservée');
 assert.match(app,/await window\.NexusLinkCore\.publish\(link\.pair/,'action de secours toujours possible');
 assert.match(src('index.html'),/rituel-nexus\.js\?v=1\.10\.8/);
 assert.match(src('sw.js'),/rituel-v1\.10\.8-link-only-auto/);
});
