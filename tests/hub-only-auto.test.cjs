'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Rituel ne retourne jamais automatiquement vers le relais historique',()=>{
 const app=src('rituel-nexus.js'),from=app.indexOf(' function queue(){'),to=app.indexOf(' async function test(){',from);
 assert.ok(from>=0&&to>from,'délimitation de la file automatique');
 const auto=app.slice(from,to);
 assert.match(auto,/await sendHub\(\{scopes:link\.pair\.scopes,quiet:true\}\)/);
 assert.doesNotMatch(auto,/await send\(/,'ancien relais interdit en automatique');
 assert.doesNotMatch(app,/data-r-link="send"/,'aucun ancien bouton d’envoi');
 assert.match(app,/data-r-link="send-hub"/,'envoi LINK conservé');
 assert.match(src('index.html'),/rituel-nexus\.js\?v=1\.10\.9/);
 assert.match(src('sw.js'),/rituel-v1\.10\.9-hub-only/);
});
