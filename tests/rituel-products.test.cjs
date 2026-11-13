'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('New 70ml Rituals products have stable IDs, stock cards and official imagery',()=>{
 const app=read('app.js'),trousse=read('trousse.js'),html=read('index.html');
 for(const id of ['sport-body','ayurveda-hands']){
  assert.match(app,new RegExp("id:'"+id+"'"));
  assert.match(app,new RegExp("'"+id+"':\\{url:'https://www\\.rituals\\.com/fr-fr/"));
  assert.match(trousse,new RegExp("'"+id+"':'\\d{7}'"));
 }
 assert.match(app,/id:'sport-body'.*amount:'70 ml'/);
 assert.match(app,/id:'ayurveda-hands'.*group:'Mains'.*amount:'70 ml'/);
 assert.match(html,/<option>Mains<\/option>/);
 assert.match(app,/stock:\{\}/);
 assert.match(read('sw.js'),/rituel-v1\.10\.8-link-only-auto/);
 assert.match(html,/app\.js\?v=1\.10\.0/);
});
test('Body lotion is alternative to Sakura and hands are an optional evening step',()=>{
 const app=read('app.js');
 const shower=app.slice(app.indexOf('function showerTasks('),app.indexOf('function morningTasks('));
 const evening=app.slice(app.indexOf('function eveningTasks('),app.indexOf('function routines('));
 assert.match(shower,/build\('sakura','Hydrater le corps · Sport ou Sakura'/);
 assert.doesNotMatch(shower,/build\('sport-body'/);
 assert.match(shower,/pas les deux/);
 assert.match(evening,/build\('ayurveda-hands','Baume mains Ayurveda'.*true\)/);
 assert.match(app,/const STORAGE_KEY='rituel_personal_v1'/);
});
