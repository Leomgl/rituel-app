'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../edge-web/worker.js'),'utf8');
test('Proxy RITUEL refuse l’ancien relais et garde le service push',async()=>{
 assert.doesNotMatch(source,/env\.NEXUS_API/);
 assert.match(source,/env\.RITUEL_PUSH/);
 const context={URL,Response,Request,Headers,console,fetch:async()=>new Response('static')};
 vm.runInNewContext(source.replace('export default','this.worker='),context);
 let invoked=0;
 const env={RITUEL_PUSH:{fetch:async()=>{invoked++;return new Response('push-ok')}}};
 const opts={headers:{origin:'https://rituel-web.q9pfwtztsc.workers.dev'}};
 const old=await context.worker.fetch(new Request('https://rituel-web.q9pfwtztsc.workers.dev/api/v1/link/inbox',opts),env);
 assert.equal(old.status,410);
 assert.equal(invoked,0);
 const push=await context.worker.fetch(new Request('https://rituel-web.q9pfwtztsc.workers.dev/api/v1/rituel-push/status',opts),env);
 assert.equal(push.status,200);
 assert.equal(invoked,1);
});
