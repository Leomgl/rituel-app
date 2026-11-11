'use strict';
/* RITUEL V1 — self-contained personal skincare PWA. No analytics, server or external library. */
const STORAGE_KEY='rituel_personal_v1';
const DEFAULT={showerTime:'matin',times:{morning:'07:30',evening:'21:30'},owns:{cleanser:false,spf:false},checks:{},shaveDays:{},stock:{},stockHistory:{},trousse:null,purchaseLog:[],nudgeMinutes:45,pushPrefs:{morning:true,evening:true,nudge:false,stock:false,special:false}};
function load(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return {showerTime:value.showerTime==='soir'?'soir':'matin',times:{...DEFAULT.times,...(value.times||{})},owns:{...DEFAULT.owns,...(value.owns||{})},checks:value.checks&&typeof value.checks==='object'?value.checks:{},shaveDays:value.shaveDays&&typeof value.shaveDays==='object'?value.shaveDays:{},stock:value.stock&&typeof value.stock==='object'?value.stock:{},stockHistory:value.stockHistory&&typeof value.stockHistory==='object'?value.stockHistory:{},trousse:value.trousse&&typeof value.trousse==='object'?value.trousse:null,purchaseLog:Array.isArray(value.purchaseLog)?value.purchaseLog.filter(x=>x&&typeof x.id==='string'&&typeof x.productId==='string'&&typeof x.date==='string'&&Number.isSafeInteger(x.priceCents)&&x.priceCents>0).slice(-500):[],nudgeMinutes:[30,45,60,90].includes(value.nudgeMinutes)?value.nudgeMinutes:45,pushPrefs:{...DEFAULT.pushPrefs,...(value.pushPrefs||{})}};}catch(e){return JSON.parse(JSON.stringify(DEFAULT));}}
let state=load(), selectedDate=new Date(),view='today',category='Tous';
const weekdayNames=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const shortDays=['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const el=id=>document.getElementById(id);
const calendarDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const onDate=(d,days=0)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+days);
const currentWeekMonday=d=>onDate(d,-(d.getDay()+6)%7);
const localToday=()=>new Date();
const isToday=d=>calendarDate(d)===calendarDate(localToday());
function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}catch(e){toast('Stockage local indisponible sur cet appareil.');}}
function toast(msg){const box=el('toast');box.textContent=msg;box.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>box.classList.remove('show'),3200);}
const htmlSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeShopURL=raw=>{try{const url=new URL(raw);return url.protocol==='https:'?url.href:''}catch{return ''}};
const products=[
 {id:'anti',name:'48h Anti-Perspirant Cream',group:'Corps',amount:'50 ml',use:'Fine couche sur les aisselles propres et sèches.',why:'Contrôle de la transpiration et des odeurs.',tip:'Plutôt le soir ; éviter les zones irritées.'},
 {id:'face',name:'24H Hydrating Face Cream',group:'Visage',amount:'20 ml',use:'Une petite noisette sur le visage et le cou.',why:'Crème hydratante quotidienne.',tip:'Moins sur le front et le nez, davantage sur les joues.'},
 {id:'shampoo',name:'Strengthening Caffeine Shampoo',group:'Cheveux',amount:'70 ml',use:'Une noisette, masser le cuir chevelu et rincer.',why:'Shampooing fortifiant à la caféine.',tip:'Départ : lundi, mercredi, vendredi ; ajuster si besoin.'},
 {id:'serum',name:'Thirst Quencher Hydrating Skin Concentrate',group:'Visage',amount:'20 ml',use:'2 à 3 gouttes sur peau propre légèrement humide.',why:'Sérum pour compléter l’hydratation du visage.',tip:'Avant la crème visage. Le soir seulement si besoin.'},
 {id:'aftershave',name:'After Shave Refreshing Gel',group:'Barbe',amount:'Format à vérifier',use:'Petite quantité sur les zones rasées, après rinçage et séchage.',why:'Rafraîchit la peau après le rasage.',tip:'À utiliser uniquement les jours de rasage.'},
 {id:'sakura',name:'The Ritual of Sakura Whipped Body Cream',group:'Corps',amount:'50 ml',use:'Massager sur les zones sèches après la douche.',why:'Hydratation du corps, parfum floral.',tip:'Ne pas rincer.'},
 {id:'foam',name:'Homme Shower Foam',group:'Corps',amount:'50 ml',use:'Petite noisette sur le corps mouillé, faire mousser, rincer.',why:'Nettoyage du corps sous la douche.',tip:'Inutile d’en mettre beaucoup.'},
 {id:'oil',name:'Homme Hair & Beard Oil',group:'Barbe',amount:'30 ml',use:'2 gouttes chauffées entre les paumes, sur les longueurs.',why:'Assouplit et discipline la barbe.',tip:'Commencer mardi, jeudi et samedi, uniquement si besoin.'},
 {id:'hydrator',name:'Homme Beard Hydrator',group:'Barbe',amount:'30 ml',use:'1 pression pour commencer, masser sous la barbe.',why:'Hydrate la peau sous la barbe et assouplit les poils.',tip:'Attendre qu’il pénètre avant d’ajouter une éventuelle huile.'}
];

/* Only official Rituals URLs. Sakura currently points to the matching larger format.
   Hydrator references an older product page; availability can vary. */
const productLinks={
 anti:{url:'https://www.rituals.com/fr-fr/rituals-homme-48h-anti-perspirant-cream-50ml-1120537.html',label:'Fiche officielle'},
 face:{url:'https://www.rituals.com/fr-fr/homme-24h-hydrating-face-cream-50ml-1120289.html',label:'Fiche officielle',note:'Format actuel : 50 ml (le tien : 20 ml)'},
 shampoo:{url:'https://www.rituals.com/fr-fr/homme-strengthening-caffeine-shampoo-70ml-1122488.html',label:'Fiche officielle'},
 serum:{url:'https://www.rituals.com/fr-fr/homme-thirst-quencher-hydrating-skin-concentrate-1120271.html',label:'Fiche officielle'},
 aftershave:{url:'https://www.rituals.com/fr-fr/homme-after-shave-refreshing-gel-1120290.html',label:'Fiche officielle'},
 sakura:{url:'https://www.rituals.com/fr-fr/the-ritual-of-sakura-body-cream-220ml-1118773.html',label:'Voir le format actuel',note:'Même gamme, 220 ml au lieu de ton tube 50 ml'},
 foam:{url:'https://www.rituals.com/fr-fr/rituals-homme-shower-foam-50ml-1119070.html',label:'Fiche officielle'},
 oil:{url:'https://www.rituals.com/fr-fr/homme-hair-beard-oil-1120294.html',label:'Fiche officielle'},
 hydrator:{url:'https://www.rituals.com/fr-fr/homme-beard-hydrator-1116297.html',label:'Ancienne fiche Rituals',note:'Ancienne référence : disponibilité non garantie'}
};
function productLink(p){
 const item=productLinks[p.id]||(safeShopURL(p.shopUrl)?{url:safeShopURL(p.shopUrl),label:'Voir la boutique'}:null);
 if(!item)return '';
 return '<a class="product-official-link" href="'+htmlSafe(item.url)+'" target="_blank" rel="noopener noreferrer">'+htmlSafe(item.label)+' ↗</a>'+(item.note?'<small class="link-qualification">'+htmlSafe(item.note)+'</small>':'');
}
function stockEntry(id){
 const raw=state.stock&&state.stock[id]&&typeof state.stock[id]==='object'?state.stock[id]:{};
 const level=Number.isFinite(raw.level)?Math.max(0,Math.min(100,Math.round(raw.level/5)*5)):null;
 const reserve=Number.isInteger(raw.reserve)?Math.max(0,Math.min(99,raw.reserve)):0;
 return {level,reserve};
}
function setStock(id,change){
 const current=stockEntry(id);
 state.stock[id]={...current,...change};
 save();
 renderStock();
 renderProducts();
 syncPushState();
}
function stockStatus(stock){
 if(stock.level===null)return {label:'À renseigner',cls:'is-unknown'};
 if(stock.level===0&&stock.reserve===0)return {label:'Épuisé',cls:'is-out'};
 if(stock.level<=25&&stock.reserve===0)return {label:'À racheter',cls:'is-low'};
 if(stock.level<=25&&stock.reserve>0)return {label:'Réserve disponible',cls:''};
 return {label:'En stock',cls:''};
}
function renderStock(){
 const items=products.map(p=>({product:p,stock:stockEntry(p.id)}));
 const low=items.filter(v=>v.stock.level!==null&&v.stock.level<=25&&v.stock.reserve===0).length;
 const unknown=items.filter(v=>v.stock.level===null).length;
 el('stock-overview').innerHTML=
   '<div class="stock-stat"><strong>'+products.length+'</strong><span>Produits</span></div>'+
   '<div class="stock-stat"><strong>'+low+'</strong><span>À racheter</span></div>'+
   '<div class="stock-stat"><strong>'+unknown+'</strong><span>À renseigner</span></div>';
 el('stock-list').innerHTML=items.map(({product:p,stock:v})=>{
   const status=stockStatus(v);
   return '<article class="stock-card">'+
    '<div class="stock-card-header"><span class="stock-card-index">'+String(products.indexOf(p)+1).padStart(2,'0')+'</span>'+
    '<div class="stock-card-info"><h3>'+htmlSafe(p.name)+'</h3><p>'+htmlSafe(p.group)+' · '+htmlSafe(p.amount)+'</p><span class="stock-state '+status.cls+'">'+status.label+'</span></div></div>'+
    '<div class="stock-level-head"><label for="stock-range-'+p.id+'">Niveau restant</label><strong data-level-output="'+p.id+'">'+(v.level===null?'Non renseigné':v.level+' %')+'</strong></div>'+
    '<input class="stock-range" id="stock-range-'+p.id+'" type="range" min="0" max="100" step="5" value="'+(v.level===null?100:v.level)+'" data-stock-range="'+p.id+'" aria-label="Niveau restant de '+htmlSafe(p.name)+'">'+
    '<div class="stock-controls"><button type="button" class="stock-quick" data-stock-action="full" data-product-id="'+p.id+'">Plein · 100 %</button><button type="button" class="stock-quick" data-stock-action="empty" data-product-id="'+p.id+'">Terminé · 0 %</button></div>'+
    '<div class="stock-reserve"><span class="stock-reserve-label">Flacons de réserve</span><div class="stock-reserve-controls">'+
    '<button type="button" data-stock-reserve="-1" data-product-id="'+p.id+'" aria-label="Retirer une réserve de '+htmlSafe(p.name)+'" '+(v.reserve<=0?'disabled':'')+'>−</button>'+
    '<span aria-label="'+v.reserve+' en réserve">'+v.reserve+'</span>'+
    '<button type="button" data-stock-reserve="1" data-product-id="'+p.id+'" aria-label="Ajouter une réserve de '+htmlSafe(p.name)+'" '+(v.reserve>=99?'disabled':'')+'>+</button></div></div>'+
    '<div>'+productLink(p)+'</div></article>';
 }).join('');
}


/* Web Push for the installed iOS Home Screen PWA.
   No push permission is requested automatically. Push endpoints are stored
   only on Cloudflare, after the user taps "Activer les notifications". */
const PUSH_API=(window.RITUEL_PUSH_API||'').replace(/\/+$/,'');
const PUSH_IDENTITY_KEY='rituel_push_credentials_v1';
let pushConfig=null,pushRegistered=false,pushRequestBusy=false;
function pushIdentity(){
 try{
  const existing=JSON.parse(localStorage.getItem(PUSH_IDENTITY_KEY)||'null');
  if(existing&&typeof existing.deviceId==='string'&&typeof existing.deviceToken==='string')return existing;
  const key=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),b=>b.toString(16).padStart(2,'0')).join('');
  const identity={deviceId:key(),deviceToken:key()};
  localStorage.setItem(PUSH_IDENTITY_KEY,JSON.stringify(identity));return identity;
 }catch{return null;}
}
function pushSupported(){return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;}
function homeScreenApp(){return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;}
function appTimeZone(){return Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Paris';}
function pushPreferences(){return {morningTime:state.times.morning,eveningTime:state.times.evening,timezone:appTimeZone(),flags:{...state.pushPrefs}};}
function b64ToBytes(str){
 const normalized=str.replace(/-/g,'+').replace(/_/g,'/');
 const binary=atob(normalized+'='.repeat((4-normalized.length%4)%4));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function pushPost(path,payload){
 if(!PUSH_API)throw Error('Le serveur push est en cours de configuration.');
 const result=await fetch(PUSH_API+path,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const data=await result.json().catch(()=>({}));
 if(!result.ok)throw Error(data.error||'Impossible de contacter le serveur push.');
 return data;
}
function renderPushSettings(){
 document.querySelectorAll('[data-push-option]').forEach(input=>{input.checked=!!state.pushPrefs[input.dataset.pushOption];});
 const status=el('push-status'),button=el('enable-push'),test=el('test-push'),disable=el('disable-push');
 if(!PUSH_API){status.textContent='En préparation · le serveur d’envoi doit encore être relié.';button.disabled=true;button.textContent='Notifications bientôt disponibles';test.disabled=true;disable.disabled=true;return;}
 if(!pushSupported()){status.textContent='Les notifications push ne sont pas disponibles dans ce navigateur.';button.disabled=true;test.disabled=true;disable.disabled=true;return;}
 if(!homeScreenApp()){status.textContent='Ouvre RITUEL depuis son icône sur l’écran d’accueil pour autoriser les push sur iPhone.';button.disabled=true;test.disabled=true;disable.disabled=true;return;}
 if(!pushConfig?.ready){status.textContent='Serveur non configuré : installation des clés d’envoi requise.';button.disabled=true;test.disabled=true;disable.disabled=true;return;}
 status.textContent=pushRegistered?'Notifications activées sur cet appareil ✅':'Notifications désactivées sur cet appareil.';
 button.disabled=pushRequestBusy||pushRegistered;
 button.textContent=pushRegistered?'Notifications activées':'Activer les notifications';
 test.disabled=!pushRegistered||pushRequestBusy;
 disable.disabled=!pushRegistered||pushRequestBusy;
}
async function initPush(){
 if(!PUSH_API){renderPushSettings();return;}
 try{
  const response=await fetch(PUSH_API+'/api/config',{cache:'no-store'});
  if(!response.ok)throw Error('Service indisponible');
  pushConfig=await response.json();
  if(pushSupported()&&homeScreenApp()&&Notification.permission==='granted'){
   const registration=await navigator.serviceWorker.ready;
   const subscription=await registration.pushManager.getSubscription();
   if(subscription&&pushIdentity()){
    const identity=pushIdentity();
    await pushPost('/api/register',{...identity,subscription:subscription.toJSON(),preferences:pushPreferences()});
    pushRegistered=true;await syncPushState();
   }
  }
 }catch(error){console.warn('Push initialization:',String(error));}
 renderPushSettings();
}
async function enablePush(){
 if(pushRequestBusy)return;
 if(!pushSupported()||!homeScreenApp()){toast('Ouvre RITUEL depuis l’icône installée sur l’écran d’accueil.');return;}
 if(!pushConfig?.ready){toast('Le service d’envoi n’est pas encore configuré.');return;}
 pushRequestBusy=true;renderPushSettings();
 try{
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')throw Error('Notifications non autorisées dans les réglages iPhone.');
  const registration=await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(pushConfig.publicKey)});
  const identity=pushIdentity();if(!identity)throw Error('Stockage local indisponible.');
  await pushPost('/api/register',{...identity,subscription:subscription.toJSON(),preferences:pushPreferences()});
  pushRegistered=true;
  await syncPushState();
  toast('Notifications activées ! Tu peux envoyer un test.');
 }catch(error){toast(error.message||'Activation impossible.');}
 finally{pushRequestBusy=false;renderPushSettings();}
}
async function syncPushPreferences(){
 if(!pushRegistered||!PUSH_API)return;
 const identity=pushIdentity();if(!identity)return;
 try{await pushPost('/api/preferences',{...identity,preferences:pushPreferences()});}
 catch(error){console.warn('Push preferences:',String(error));}
}
async function syncPushState(){
 if(!pushRegistered||!PUSH_API)return;
 const identity=pushIdentity();if(!identity)return;
 const date=localToday(),day=calendarDate(date),tasks=routines(date);
 const done=steps=>steps.filter(x=>!x.optional).every(x=>!!state.checks[day+':'+x.id]);
 const lowStock=products.filter(p=>{const v=stockEntry(p.id);return window.RITUEL_ENHANCED ? window.RITUEL_ENHANCED.needsRestock(p.id) : v.level!==null&&v.level<=25&&v.reserve===0;}).length;
 try{await pushPost('/api/state',{...identity,date:day,morningDone:done(tasks.morning),eveningDone:done(tasks.evening),lowStock});}
 catch(error){console.warn('Push state:',String(error));}
}
async function testPush(){
 const identity=pushIdentity();if(!pushRegistered||!identity)return;
 try{await pushPost('/api/test',identity);toast('Notification test envoyée. Regarde ton écran verrouillé.');}
 catch(error){toast(error.message||'Test impossible.');}
}
async function disablePush(){
 const identity=pushIdentity();if(!identity)return;
 if(!confirm('Désactiver les notifications de RITUEL sur cet iPhone ?'))return;
 try{
  await pushPost('/api/unsubscribe',identity);
  const registration=await navigator.serviceWorker.ready;
  const sub=await registration.pushManager.getSubscription();if(sub)await sub.unsubscribe();
  pushRegistered=false;renderPushSettings();toast('Notifications désactivées.');
 }catch(error){toast(error.message||'Désactivation impossible.');}
}

const build=(id,title,amount,detail,tip,optional=false)=>({id,title,amount,detail,tip,optional});
function showerTasks(date){const weekday=date.getDay();let steps=[build('foam','Mousse de douche Homme','Une petite noisette','Sur le corps mouillé, faire mousser puis rincer.','C’est un produit pour le corps, pas un nettoyant visage.')];
 if([1,3,5].includes(weekday))steps.push(build('shampoo','Shampooing à la caféine','Une noisette','Masser le cuir chevelu, rincer soigneusement.','3 fois par semaine pour commencer. Si tes cheveux regraissent vite, ajuste.'));
 steps.push(build('sakura','Crème corps Sakura','Selon les zones sèches','Après la douche, sur le corps, sans rinçage.','Facultatif si la peau du corps n’est pas sèche.',true));return steps;}
function morningTasks(date){let steps=[build('wash-am','Nettoyer le visage',state.owns.cleanser?'Nettoyant doux':'Eau tiède','Nettoyer sans frotter, puis tamponner doucement avec une serviette.','Le nettoyant visage doux est un ajout intéressant. Le gel douche n’est pas l’idéal pour le visage.')];
 if(state.shaveDays[calendarDate(date)])steps.push(build('aftershave','Gel après-rasage','Une petite quantité','Sur les zones fraîchement rasées, après rinçage et séchage.','Si cela pique ou irrite, ne pas l’appliquer.'));
 steps.push(build('serum-am','Thirst Quencher','2 à 3 gouttes','Sur le visage légèrement humide, surtout les joues.','À appliquer avant la crème ; une fois par jour suffit généralement au départ.'));
 steps.push(build('face-am','Crème hydratante visage 24 h','Une petite noisette','Répartir sur les joues, le front et le cou.','Sur la zone T (front/nez), commencer avec une couche très fine.'));
 steps.push(build('hydrator','Beard Hydrator','1 pression pour commencer','Masser la peau sous la barbe, menton et mâchoire.','Adapter à la densité de la barbe. Le but n’est pas de saturer les poils.'));
 if(state.owns.spf)steps.push(build('spf','Protection solaire SPF 30–50','Quantité suffisante pour couvrir les zones exposées','Dernière étape des soins visage, avant de sortir.','Renouveler en cas d’exposition prolongée.'));
 return steps;}
function eveningTasks(date){let steps=[build('wash-pm','Nettoyer le visage',state.owns.cleanser?'Nettoyant visage doux':'Nettoyage du soir','Retirer les impuretés de la journée avec un nettoyant adapté.','Si tu utilises une protection solaire, un nettoyant visage doux est particulièrement utile.')];
 steps.push(build('serum-pm','Thirst Quencher (si besoin)','2 gouttes','Seulement si ta peau tiraille ou semble déshydratée.','Facultatif : le sérum du matin peut suffire.',true));
 steps.push(build('face-pm','Crème visage 24 h','Une petite noisette','Hydrater le visage et le cou, en ajustant selon les zones.','Dose légère sur la zone T.'));
 if([2,4,6].includes(date.getDay()))steps.push(build('oil','Hair & Beard Oil','2 gouttes','Chauffer entre les paumes, répartir sur les longueurs, puis brosser.','Huile facultative, surtout utile lorsque la barbe est rêche.',true));
 steps.push(build('anti','Crème anti-transpirante 48 h','Fine couche','Appliquer sur les aisselles propres et parfaitement sèches.','Selon la transpiration et la tolérance ; ne pas appliquer sur peau irritée.',true));return steps;}
function routines(date){const shower=showerTasks(date);return {morning:state.showerTime==='matin'?[...shower,...morningTasks(date)]:morningTasks(date),evening:state.showerTime==='soir'?[...shower,...eveningTasks(date)]:eveningTasks(date)};}
function essentialProgress(date){const tasks=routines(date),all=[...tasks.morning,...tasks.evening].filter(t=>!t.optional);let completed=all.filter(t=>!!state.checks[`${calendarDate(date)}:${t.id}`]).length;return {completed,total:all.length,percent:all.length?Math.round(100*completed/all.length):100};}
function renderWeek(){const today=localToday(),weekStart=currentWeekMonday(today),target=calendarDate(selectedDate);
 el('week-strip').innerHTML=Array.from({length:7},(_,i)=>{const d=onDate(weekStart,i),iso=calendarDate(d),prog=essentialProgress(d);return `<button class="day-pill ${isToday(d)?'is-current':''} ${iso===target?'is-selected':''}" data-iso="${iso}" aria-pressed="${iso===target}"><span class="dow">${shortDays[d.getDay()]}</span><span class="daynum">${d.getDate()}</span>${prog.completed?'<span class="dot"></span>':'<span style="height:4px"></span>'}</button>`;}).join('');}
function renderRoutine(kind,tasks,date){let essential=tasks.filter(t=>!t.optional),complete=essential.filter(t=>state.checks[`${calendarDate(date)}:${t.id}`]).length,am=kind==='morning';
 const title=am?'Le matin':'Le soir', time=state.times[am?'morning':'evening'];
 let html=`<div class="routine-head"><span class="routine-symbol ${am?'':'night'}">${am?'☀':'☾'}</span><div class="routine-head-text"><h2>${title}</h2><span>${time} · ${am?'Se préparer pour la journée':'Récupérer en douceur'}</span></div><span class="routine-count">${complete}/${essential.length}</span></div>`;
 html+=tasks.map(task=>{const id=`${calendarDate(date)}:${task.id}`,done=!!state.checks[id];return `<div class="task ${done?'done':''}"><input class="task-check" type="checkbox" aria-label="${task.title}" data-task="${task.id}" ${done?'checked':''}><div class="task-info"><div class="task-title-row"><span class="task-title">${task.title}</span>${task.optional?'<span class="pill optional">SI BESOIN</span>':''}</div><div class="task-amount">${task.amount}</div><p class="task-explain">${task.detail}</p><button type="button" class="task-detail" data-detail="${task.id}" aria-expanded="false">Conseil <span aria-hidden="true">⌄</span></button><div class="task-tip" data-tip="${task.id}" hidden>${task.tip}</div></div></div>`;}).join('');
 if(am)html+=`<div class="shave-banner"><button class="shave-toggle ${state.shaveDays[calendarDate(date)]?'on':''}" id="shave-toggle">✂ ${state.shaveDays[calendarDate(date)]?'Rasage prévu : oui · enlever':'J’ai rasé / je rase mes contours aujourd’hui'}</button></div>`;
 el(am?'morning-routine':'evening-routine').innerHTML=html;}
function renderToday(){const date=selectedDate,prog=essentialProgress(date),label=new Intl.DateTimeFormat('fr-FR',{weekday:'long',day:'numeric',month:'long'}).format(date),isCurrent=isToday(date);el('date-line').textContent=(isCurrent?'AUJOURD’HUI · ':'')+label.toLocaleUpperCase('fr-FR');el('selected-day-label').textContent=isCurrent?'Les soins d’aujourd’hui':label;el('hero-title').textContent=prog.percent===100?'C’est fait. Bravo !':prog.completed===0?'Un geste à la fois.':'Tu es sur ta lancée.';el('hero-desc').textContent=`${prog.completed} sur ${prog.total} soins essentiels effectués`;el('progress-pct').textContent=`${prog.percent}%`;el('progress-disc').style.setProperty('--pct',`${prog.percent}%`);el('progress-disc').setAttribute('aria-label',`${prog.percent}% des soins essentiels effectués`);renderWeek();const steps=routines(date);renderRoutine('morning',steps.morning,date);renderRoutine('evening',steps.evening,date);}
function renderProducts(){const groups=[...new Set(['Tous','Visage','Barbe','Cheveux','Corps',...products.map(p=>p.group)])];el('category-filter').innerHTML=groups.map(g=>`<button class="filter-button ${category===g?'active':''}" data-category="${htmlSafe(g)}" aria-pressed="${category===g}">${htmlSafe(g)}</button>`).join('');el('product-list').innerHTML=products.filter(p=>category==='Tous'||p.group===category).map((p,i)=>`<article class="product-card"><div class="product-head"><span class="product-index">${String(products.indexOf(p)+1).padStart(2,'0')}</span><div><span class="category">${htmlSafe(p.group)} · ${htmlSafe(p.amount)}</span><h3>${htmlSafe(p.name)}</h3><p class="subtitle">${htmlSafe(p.why)}</p></div></div><p class="product-dose"><b>Application :</b> ${htmlSafe(p.use)}</p><p><b>Conseil :</b> ${htmlSafe(p.tip)}</p>${productLink(p)}</article>`).join('');}
function renderSettings(){renderPushSettings();document.querySelectorAll('[data-shower]').forEach(b=>{const active=b.dataset.shower===state.showerTime;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});el('owns-cleanser').checked=state.owns.cleanser;el('owns-spf').checked=state.owns.spf;el('morning-time').value=state.times.morning;el('evening-time').value=state.times.evening;}
function render(){renderToday();renderProducts();renderStock();renderSettings();}
function navigate(where){view=where;document.querySelectorAll('.view').forEach(s=>s.classList.toggle('is-visible',s.id===`${where}-view`));document.querySelectorAll('.nav-item').forEach(b=>{b.classList.toggle('active',b.dataset.view===where);b.setAttribute('aria-current',b.dataset.view===where?'page':'false');});window.scrollTo({top:0,behavior:'instant'});}
// Native calendar export. The floating local times are interpreted in the importing calendar's timezone.
function icsTimestamp(d){return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}00`;}
function utcTimestamp(d){return d.toISOString().replace(/[-:]/g,'').replace(/\.[0-9]{3}/,'');}
function icsEscape(v){return v.replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\n/g,'\\n');}
function dailyEvent(label,time,suffix){const [hour,minute]=time.split(':').map(Number);const start=localToday();start.setHours(hour,minute,0,0);if(start.getTime()<Date.now())start.setDate(start.getDate()+1);const end=new Date(start.getTime()+10*60*1000);return ['BEGIN:VEVENT',`UID:rituel-${suffix}-v1@rituel.local`,`DTSTAMP:${utcTimestamp(new Date())}`,`DTSTART:${icsTimestamp(start)}`,`DTEND:${icsTimestamp(end)}`,'RRULE:FREQ=DAILY',`SUMMARY:${icsEscape(label)}`,`DESCRIPTION:${icsEscape('Ouvre Rituel et coche ta routine du '+(suffix==='matin'?'matin':'soir')+'. '+(location.protocol==='https:'?location.origin+location.pathname:''))}`,'BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:PT0S',`DESCRIPTION:${icsEscape(label)}`,'END:VALARM','END:VEVENT'].join('\r\n');}
function downloadFile(filename,content,mime){const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function exportICS(){const content=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Rituel//Routine Personnelle V1//FR','CALSCALE:GREGORIAN','METHOD:PUBLISH',dailyEvent('Rituel — routine du matin',state.times.morning,'matin'),dailyEvent('Rituel — routine du soir',state.times.evening,'soir'),'END:VCALENDAR'].join('\r\n')+'\r\n';downloadFile('rituel-rappels-matin-soir.ics',content,'text/calendar;charset=utf-8');toast('Fichier Calendrier créé · à importer dans ton agenda.');}
function bind(){document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.view)));el('settings-shortcut').addEventListener('click',()=>navigate('settings'));el('go-today').addEventListener('click',()=>{selectedDate=localToday();renderToday();});el('week-strip').addEventListener('click',e=>{const b=e.target.closest('[data-iso]');if(!b)return;const [y,m,d]=b.dataset.iso.split('-').map(Number);selectedDate=new Date(y,m-1,d);renderToday();});
 for(const id of ['morning-routine','evening-routine']){const area=el(id);area.addEventListener('change',e=>{const t=e.target;if(!t.matches('[data-task]'))return;state.checks[`${calendarDate(selectedDate)}:${t.dataset.task}`]=t.checked;save();renderToday();syncPushState();});area.addEventListener('click',e=>{const detail=e.target.closest('[data-detail]');if(detail){const tip=area.querySelector(`[data-tip="${detail.dataset.detail}"]`);tip.hidden=!tip.hidden;detail.setAttribute('aria-expanded',!tip.hidden);return;}const shave=e.target.closest('#shave-toggle');if(shave){const key=calendarDate(selectedDate);state.shaveDays[key]=!state.shaveDays[key];save();renderToday();syncPushState();}});}

 el('stock-list').addEventListener('input',e=>{
   const input=e.target.closest('[data-stock-range]');if(!input)return;
   const out=el('stock-list').querySelector('[data-level-output="'+input.dataset.stockRange+'"]');
   if(out)out.textContent=input.value+' %';
 });
 el('stock-list').addEventListener('change',e=>{
   const input=e.target.closest('[data-stock-range]');if(!input)return;
   setStock(input.dataset.stockRange,{level:Number(input.value)});
 });
 el('stock-list').addEventListener('click',e=>{
   const control=e.target.closest('[data-stock-action],[data-stock-reserve]');
   if(!control)return;
   const id=control.dataset.productId;
   if(!products.some(p=>p.id===id))return;
   if(control.dataset.stockAction==='full')setStock(id,{level:100});
   if(control.dataset.stockAction==='empty')setStock(id,{level:0});
   if(control.dataset.stockReserve){
     const step=Number(control.dataset.stockReserve);
     setStock(id,{reserve:Math.max(0,Math.min(99,stockEntry(id).reserve+step))});
   }
 });
 el('refresh-app').addEventListener('click',async()=>{
   if(!navigator.onLine){toast('Connexion nécessaire pour vérifier les mises à jour.');return;}
   try{if('serviceWorker' in navigator){const registration=await navigator.serviceWorker.getRegistration();if(registration)await registration.update();}}
   catch(error){/* A reload will still request fresh files. */}
   const target=new URL(window.location.href);
   target.searchParams.set('maj',String(Date.now()));
   window.location.replace(target.href);
 });
 el('category-filter').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;renderProducts();});document.querySelectorAll('[data-shower]').forEach(b=>b.addEventListener('click',()=>{state.showerTime=b.dataset.shower;save();render();syncPushState();toast('Moment de douche mis à jour.');}));el('owns-cleanser').addEventListener('change',e=>{state.owns.cleanser=e.target.checked;save();render();syncPushState();});el('owns-spf').addEventListener('change',e=>{state.owns.spf=e.target.checked;save();render();syncPushState();});for(const [id,key] of [['morning-time','morning'],['evening-time','evening']])el(id).addEventListener('change',e=>{if(/^\d\d:\d\d$/.test(e.target.value)){state.times[key]=e.target.value;save();renderToday();syncPushPreferences();}else{e.target.value=state.times[key];}});
 el('enable-push').addEventListener('click',enablePush);
 el('test-push').addEventListener('click',testPush);
 el('disable-push').addEventListener('click',disablePush);
 document.querySelectorAll('[data-push-option]').forEach(input=>input.addEventListener('change',e=>{
  state.pushPrefs[e.target.dataset.pushOption]=e.target.checked;save();renderPushSettings();syncPushPreferences();
 }));
 el('export-ics').addEventListener('click',exportICS);el('export-backup').addEventListener('click',()=>{downloadFile(`rituel-sauvegarde-${calendarDate(localToday())}.json`,JSON.stringify({format:'rituel-v1',exportedAt:new Date().toISOString(),data:state},null,2),'application/json');toast('Sauvegarde locale téléchargée.');});el('import-backup').addEventListener('click',()=>el('backup-file').click());
 el('backup-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const raw=JSON.parse(await file.text());if(raw.format!=='rituel-v1'||!raw.data||typeof raw.data!=='object'||!raw.data.checks||typeof raw.data.checks!=='object')throw Error('Format non reconnu');if(!confirm('Restaurer cette sauvegarde ? Ton suivi actuel sera remplacé.'))return;localStorage.setItem(STORAGE_KEY,JSON.stringify(raw.data));state=load();selectedDate=localToday();window.RITUEL_TROUSSE?.hydrate();render();syncPushState();syncPushPreferences();toast('Sauvegarde restaurée.');}catch(err){toast('Fichier de sauvegarde invalide.');}finally{e.target.value='';}});
 el('reset-data').addEventListener('click',()=>{if(confirm('Effacer toutes les cases cochées et les jours de rasage ? Tes réglages resteront en place.')){state.checks={};state.shaveDays={};save();renderToday();syncPushState();toast('Suivi réinitialisé.');}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isToday(selectedDate)){selectedDate=localToday();renderToday();syncPushState();}});
}
bind();render();navigate('today');initPush();
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').then(reg=>{if(navigator.onLine)reg.update().catch(()=>{});}).catch(()=>{});
