import * as WebPush from '@portable/web-push';

const ORIGIN = 'https://leomgl.github.io';
const PUBLIC_APP_URL = 'https://leomgl.github.io/rituel-app/';
const ALLOWED_HOSTS = ['push.apple.com', 'fcm.googleapis.com', 'push.services.mozilla.com'];
const FLAG_NAMES = ['morning', 'evening', 'nudge', 'stock', 'special'];

function cors(origin) {
  const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
  if (origin === ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ORIGIN;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}
function json(body, status=200, origin='') {
  return new Response(JSON.stringify(body), {status, headers:cors(origin)});
}
function validTime(value) {return typeof value==='string' && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);}
function bool(value) {return value===true?1:0;}
function safePrefs(p) {
  const value=p && typeof p==='object'?p:{};
  const flags=value.flags && typeof value.flags==='object'?value.flags:{};
  const morning=validTime(value.morningTime)?value.morningTime:'07:30';
  const evening=validTime(value.eveningTime)?value.eveningTime:'21:30';
  const timezone=typeof value.timezone==='string' && value.timezone.length<90 ? value.timezone : 'Europe/Paris';
  try {new Intl.DateTimeFormat('en-US',{timeZone:timezone});}
  catch {throw new Error('Invalid timezone');}
  return {morning,evening,timezone,flags:Object.fromEntries(FLAG_NAMES.map(k=>[k,bool(flags[k])]))};
}
function idOk(v){return typeof v==='string' && /^[a-zA-Z0-9_-]{20,100}$/.test(v);}
async function tokenHash(s) {
  if(!idOk(s))throw new Error('Invalid device token');
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validSubscription(sub) {
  if(!sub || typeof sub!=='object'||typeof sub.endpoint!=='string' || !sub.keys) return false;
  let url;
  try{url=new URL(sub.endpoint);}catch{return false;}
  if(url.protocol!=='https:'||url.username||url.password||url.port) return false;
  const host=url.hostname.toLowerCase();
  const allowed=ALLOWED_HOSTS.some(domain=>host===domain||host.endsWith('.'+domain));
  return allowed && sub.endpoint.length<3000
    && typeof sub.keys.p256dh==='string'&&sub.keys.p256dh.length>=70&&sub.keys.p256dh.length<=150
    && typeof sub.keys.auth==='string'&&sub.keys.auth.length>=16&&sub.keys.auth.length<=80;
}
async function readBody(request) {
  if(!request.headers.get('content-type')?.toLowerCase().includes('application/json'))throw new Error('JSON required');
  if(Number(request.headers.get('content-length')||0)>6000)throw new Error('Body too large');
  const raw=await request.text();
  if(raw.length>6000)throw new Error('Body too large');
  const val=JSON.parse(raw);
  if(!val || typeof val!=='object'||Array.isArray(val))throw new Error('Invalid JSON');
  return val;
}
async function findDevice(env, body) {
  if(!idOk(body.deviceId)||!idOk(body.deviceToken))return null;
  const row=await env.DB.prepare('SELECT * FROM devices WHERE device_id=?').bind(body.deviceId).first();
  if(!row)return null;
  const hash=await tokenHash(body.deviceToken);
  if(row.token_hash!==hash)return null;
  return row;
}
function makeVapid(env) {
  if(!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)throw new Error('VAPID not configured');
  return {publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY,subject:env.VAPID_SUBJECT};
}
async function sendDevice(row, env, kind, title, body, localDate) {
  const payload=JSON.stringify({title,body,url:PUBLIC_APP_URL,tag:'rituel-'+kind,kind});
  const result=await WebPush.send({
    subscription:{endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},
    vapid:makeVapid(env),payload,ttl:3600,urgency:'normal'
  });
  if(result.kind==='gone') {
    await env.DB.prepare('DELETE FROM devices WHERE device_id=?').bind(row.device_id).run();
    return 'gone';
  }
  return 'sent';
}
function localClock(timezone, date){
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const parts=Object.fromEntries(formatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {date:parts.year+'-'+parts.month+'-'+parts.day,weekday:parts.weekday,
    minute:Number(parts.hour)*60+Number(parts.minute)};
}
function near(clockMin, hhmm){
  const [h,m]=hhmm.split(':').map(Number);
  const diff=clockMin-(h*60+m);
  return diff>=0&&diff<5;
}
function nudgeNear(clockMin,hhmm){
  const [h,m]=hhmm.split(':').map(Number);
  const target=h*60+m+45;
  return target<1440 && clockMin>=target&&clockMin<target+5;
}
async function deliverOnce(row, env, kind, day, title, body) {
  const reserved=await env.DB.prepare('INSERT OR IGNORE INTO delivery_log (device_id, local_date, kind) VALUES (?,?,?)').bind(row.device_id,day,kind).run();
  if(!reserved.meta?.changes)return;
  try{await sendDevice(row,env,kind,title,body,day);}
  catch(error) {
    // Keep the subscription, but retry this notification at the next cron tick.
    await env.DB.prepare('DELETE FROM delivery_log WHERE device_id=? AND local_date=? AND kind=?').bind(row.device_id,day,kind).run();
    console.error('Push failed for kind',kind, String(error).slice(0,120));
  }
}
async function scheduled(env){
  const now=new Date();
  const result=await env.DB.prepare('SELECT * FROM devices WHERE last_seen > unixepoch()-7776000 LIMIT 200').all();
  for(const row of result.results||[]){
    let clock;try{clock=localClock(row.timezone,now);}catch{continue;}
    const day=clock.date;
    const isMonWedFri=['Mon','Wed','Fri'].includes(clock.weekday);
    const isTueThuSat=['Tue','Thu','Sat'].includes(clock.weekday);
    if(row.morning_on&&near(clock.minute,row.morning_time)){
      await deliverOnce(row,env,'morning',day,'RITUEL · Bonjour ☀️','Ta routine du matin t’attend. Quelques minutes pour toi.');
    }
    if(row.evening_on&&near(clock.minute,row.evening_time)){
      await deliverOnce(row,env,'evening',day,'RITUEL · Bonne soirée 🌙','C’est le moment de ta routine du soir.');
    }
    if(row.nudge_on && row.done_date===day && row.morning_on && !row.done_morning && nudgeNear(clock.minute,row.morning_time)){
      await deliverOnce(row,env,'nudge-morning',day,'Un petit rappel ☀️','Ta routine du matin n’est pas encore terminée.');
    }
    if(row.nudge_on && row.done_date===day && row.evening_on && !row.done_evening && nudgeNear(clock.minute,row.evening_time)){
      await deliverOnce(row,env,'nudge-evening',day,'Encore un geste ? 🌙','Il reste quelques soins à cocher ce soir.');
    }
    if(row.stock_on && row.stock_low>0 && clock.weekday==='Sun' && near(clock.minute,'18:00')){
      await deliverOnce(row,env,'stock',day,'RITUEL · Stock à prévoir 📦',row.stock_low+' produit(s) à racheter. Consulte ton inventaire.');
    }
    if(row.special_on && near(clock.minute,'08:00') && (isMonWedFri||isTueThuSat)){
      const txt=isMonWedFri?'Shampooing fortifiant prévu aujourd’hui.':'Huile à barbe prévue aujourd’hui, si nécessaire.';
      await deliverOnce(row,env,'special',day,'RITUEL · Soin du jour ✨',txt);
    }
  }
  await env.DB.prepare('DELETE FROM delivery_log WHERE created_at < unixepoch()-2592000').run();
  await env.DB.prepare('DELETE FROM devices WHERE last_seen < unixepoch()-7776000').run();
}

export default {
  async fetch(request,env) {
    const origin=request.headers.get('origin')||'';
    const url=new URL(request.url);
    if(url.pathname==='/api/health'&&request.method==='GET')
      return json({ok:true,service:'rituel-push'},200,origin);
    if(origin!==ORIGIN) return json({error:'Origin not allowed'},403,origin);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    if(url.pathname==='/api/config'&&request.method==='GET'){
      return json({ready:!!(env.VAPID_PUBLIC_KEY&&env.VAPID_PRIVATE_KEY&&env.VAPID_SUBJECT),
        publicKey:env.VAPID_PUBLIC_KEY||null},200,origin);
    }
    if(request.method!=='POST')return json({error:'Not found'},404,origin);
    let body;try{body=await readBody(request);}catch(error){return json({error:String(error.message||error)},400,origin);}
    if(!idOk(body.deviceId)||!idOk(body.deviceToken))return json({error:'Invalid credentials'},400,origin);

    if(url.pathname==='/api/register'){
      if(!validSubscription(body.subscription))return json({error:'Invalid subscription endpoint or keys'},400,origin);
      let prefs;try{prefs=safePrefs(body.preferences);}catch{return json({error:'Invalid preferences'},400,origin);}
      const hash=await tokenHash(body.deviceToken);
      const existing=await env.DB.prepare('SELECT token_hash FROM devices WHERE device_id=?').bind(body.deviceId).first();
      if(existing&&existing.token_hash!==hash)return json({error:'Forbidden'},403,origin);
      const args=[body.deviceId,hash,body.subscription.endpoint,body.subscription.keys.p256dh,body.subscription.keys.auth,
        prefs.timezone,prefs.morning,prefs.evening,...FLAG_NAMES.map(k=>prefs.flags[k])];
      if(existing){
        await env.DB.prepare('UPDATE devices SET endpoint=?,p256dh=?,auth=?,timezone=?,morning_time=?,evening_time=?,morning_on=?,evening_on=?,nudge_on=?,stock_on=?,special_on=?,last_seen=unixepoch() WHERE device_id=?')
          .bind(...args.slice(2),body.deviceId).run();
      }else{
        await env.DB.prepare('INSERT INTO devices (device_id,token_hash,endpoint,p256dh,auth,timezone,morning_time,evening_time,morning_on,evening_on,nudge_on,stock_on,special_on) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
          .bind(...args).run();
      }
      return json({ok:true},200,origin);
    }
    const row=await findDevice(env,body);
    if(!row)return json({error:'Unknown device / unauthorized'},403,origin);
    if(url.pathname==='/api/preferences'){
      let p;try{p=safePrefs(body.preferences);}catch{return json({error:'Invalid preferences'},400,origin);}
      await env.DB.prepare('UPDATE devices SET timezone=?,morning_time=?,evening_time=?,morning_on=?,evening_on=?,nudge_on=?,stock_on=?,special_on=?,last_seen=unixepoch() WHERE device_id=?')
        .bind(p.timezone,p.morning,p.evening,...FLAG_NAMES.map(k=>p.flags[k]),body.deviceId).run();
      return json({ok:true},200,origin);
    }
    if(url.pathname==='/api/state'){
      const date=body.date;
      if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return json({error:'Invalid date'},400,origin);
      const current=localClock(row.timezone,new Date()).date;
      if(date!==current)return json({ok:true,ignored:'not today'},200,origin);
      const count=Number.isInteger(body.lowStock)?Math.max(0,Math.min(9,body.lowStock)):0;
      await env.DB.prepare('UPDATE devices SET done_date=?,done_morning=?,done_evening=?,stock_low=?,last_seen=unixepoch() WHERE device_id=?')
        .bind(date,bool(body.morningDone),bool(body.eveningDone),count,body.deviceId).run();
      return json({ok:true},200,origin);
    }
    if(url.pathname==='/api/test'){
      const now=Math.floor(Date.now()/1000);
      if(now-row.last_test<90)return json({error:'Attendre 90 secondes entre deux tests'},429,origin);
      await env.DB.prepare('UPDATE devices SET last_test=?,last_seen=unixepoch() WHERE device_id=?').bind(now,body.deviceId).run();
      try{
        const result=await sendDevice(row,env,'test','RITUEL · Notifications activées ✅','Ton iPhone reçoit bien les notifications de RITUEL.',localClock(row.timezone,new Date()).date);
        return json({ok:result==='sent'},result==='sent'?200:410,origin);
      }catch(error){return json({error:'Push service error',detail:String(error.message||error).slice(0,120)},502,origin);}
    }
    if(url.pathname==='/api/unsubscribe'){
      await env.DB.prepare('DELETE FROM devices WHERE device_id=?').bind(body.deviceId).run();
      return json({ok:true},200,origin);
    }
    return json({error:'Not found'},404,origin);
  },
  async scheduled(_event,env,ctx) {ctx.waitUntil(scheduled(env));}
};
