const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../link-hub-bus.js'),'utf8');
const rituel=fs.readFileSync(require('node:path').join(__dirname,'../rituel-nexus.js'),'utf8');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const sw=fs.readFileSync(require('node:path').join(__dirname,'../sw.js'),'utf8');
test('Rituel LINK hub is ciphertext-only and dormant until the user clicks',()=>{
 let reads=0,network=0;
 const w={};
 vm.runInNewContext(source,{window:w,TextEncoder,TextDecoder,console,
  navigator:{},indexedDB:{open(){reads++;throw Error('UNEXPECTED_DB')}},
  fetch(){network++;throw Error('UNEXPECTED_NET')}});
 assert.equal(reads,0);assert.equal(network,0);
 assert.equal(typeof w.LinkHubBus.publish,'function');
 assert.equal(typeof w.LinkHubBus.receive,'function');
 assert.match(source,/await putRecord\(db,"envelopes",key,record\)/);
 assert.match(source,/await openFromHub\(pair,from,APP_ID,item\)/);
 assert.doesNotMatch(source,/setInterval\s*\(/);
});
test('Rituel only publishes approved scope through LINK, no automatic budget writes',()=>{
 assert.match(rituel,/async function sendHub\(/);
 assert.match(rituel,/sendHub\(\{scopes:link\.pair\.scopes,quiet:true\}\)/);
 assert.match(rituel,/window\.addEventListener\('focus',queue\)/);
 assert.match(rituel,/contractId:"rituel-nexus"/);
 assert.match(rituel,/scope:item\.scope/);
 assert.match(rituel,/link\.pair\.scopes\.includes\(scope\)/);
 assert.match(rituel,/window\.LinkHubBus\.publish/);
 assert.match(html,/link-hub-bus\.js\?v=1\.10\.2/);
 assert.match(sw,/rituel-v1\.10\.4/);
 assert.match(sw,/link-hub-bus\.js/);
});