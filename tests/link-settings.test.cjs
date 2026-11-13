'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('LINK est en tête sans retirer le jumelage historique Rituel',()=>{
 const ui=src('rituel-nexus.js'),html=src('index.html'),sw=src('sw.js');
 assert.match(ui,/Gérer dans LINK/);
 assert.match(ui,/https:\/\/link-app\.q9pfwtztsc\.workers\.dev\//);
 assert.match(ui,/settings\.insertBefore\(root,firstPanel\)/);
 assert.match(ui,/rituel-legacy-link/);
 assert.match(ui,/data-r-link="send-hub"/);
 assert.match(ui,/data-r-link="enroll-hub"/);
 assert.match(ui,/data-r-link="join"/);
 assert.match(ui,/data-r-link="send"/);
 assert.match(ui,/data-r-link="test"/);
 assert.match(ui,/id="rituel-link-auto"/);
 assert.match(html,/rituel-nexus\.js\?v=1\.10\.7/);
 assert.match(sw,/rituel-v1\.10\.7-link-settings/);
});
