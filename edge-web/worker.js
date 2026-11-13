/* Isolated RITUEL web origin. Public static read-through from own GitHub Pages repo.
   Existing RITUEL push Worker and NEXUS API are reached through Cloudflare service
   bindings; browser requests remain same-origin and no vault secrets are exposed. */
const WEB_ORIGIN='https://rituel-web.q9pfwtztsc.workers.dev';
const STATIC_ORIGIN='https://leomgl.github.io/rituel-app';
const ALLOWED=new Set(['/','/index.html','/app.js','/features.js','/styles.css','/push-config.js','/link-core.js','/rituel-nexus.js','/link-hub-onboard.js','/link-hub-bus.js','/trousse.js','/rituel-travel.js','/rituel-garage.js','/manifest.webmanifest','/sw.js','/icons/icon-192.png','/icons/icon-512.png','/icons/apple-touch-icon.png']);
const CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://link-app.q9pfwtztsc.workers.dev; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
export default {
 async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(!['GET','HEAD','POST','OPTIONS'].includes(request.method))return new Response('Method Not Allowed',{status:405});
  const origin=request.headers.get('origin');
  // Prevent cross-site posting to protected same-origin service gateways.
  if(origin&&origin!==WEB_ORIGIN)return new Response('Forbidden',{status:403});
  if(path.startsWith('/api/v1/link/')||path.startsWith('/api/')){
   const link=path.startsWith('/api/v1/link/');
   const worker=link?env.NEXUS_API:env.RITUEL_PUSH;
   if(!worker)return new Response('Gateway not configured',{status:503});
   const destination=(link?'https://nexus-app-api.q9pfwtztsc.workers.dev':'https://rituel-app.q9pfwtztsc.workers.dev')+path+url.search;
   const headers=new Headers(request.headers);
   // Both upstream apps already trust the original Github Pages origin. This
   // trusted edge proxy first checks the real browser origin, then rewrites it.
   headers.set('origin','https://leomgl.github.io');
   headers.delete('cookie');
   headers.delete('host');
   headers.delete('content-length');
   const forwarded=new Request(destination,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,duplex:'half',redirect:'manual'});
   const response=await worker.fetch(forwarded);
   const out=new Headers(response.headers);
   out.delete('access-control-allow-origin');
   out.delete('access-control-allow-credentials');
   out.set('cache-control','no-store');
   out.set('x-content-type-options','nosniff');
   return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers:out});
  }
  if(!ALLOWED.has(path)||!['GET','HEAD'].includes(request.method))return new Response('Not Found',{status:404});
  const upstream=await fetch(STATIC_ORIGIN+(path==='/'?'/index.html':path),{
   method:'GET',headers:{accept:'*/*'},redirect:'follow',cf:{cacheTtl:60,cacheEverything:true}
  });
  if(!upstream.ok)return new Response('RITUEL source unavailable',{status:upstream.status>=500?503:upstream.status});
  const headers=new Headers();
  const type=upstream.headers.get('content-type');
  headers.set('content-type',type||'application/octet-stream');
  headers.set('cache-control',path==='/'||path==='/index.html'||path==='/sw.js'?'no-cache':'public, max-age=120');
  headers.set('content-security-policy',CSP);
  headers.set('referrer-policy','no-referrer');
  headers.set('x-content-type-options','nosniff');
  headers.set('x-frame-options','DENY');
  if(path==='/sw.js')headers.set('service-worker-allowed','/');
  return new Response(request.method==='HEAD'?null:upstream.body,{status:200,headers});
 }
};