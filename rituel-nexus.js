/* RITUEL → NEXUS LINK. Enabled ONLY on the isolated RITUEL HTTPS origin. */
'use strict';
(()=>{
 const NEW_ORIGIN='https://rituel-web.q9pfwtztsc.workers.dev';
 const LINK_KEY='rituel_link_v1',AUTO_KEY='rituel_link_autosend_v1';
 const migrating=location.origin!==NEW_ORIGIN;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=()=>calendarDate(localToday());
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(new Date(v+'T12:00:00').getTime())&&new Date(v+'T12:00:00').toISOString().startsWith(v);
 const str=(v,n=140)=>String(v??'').trim().slice(0,n);
 const safeEuro=v=>{const raw=String(v||'').trim().replace(/\s/g,'').replace(',','.');
  if(!/^\d{1,7}(?:\.\d{1,2})?$/.test(raw))return null;
  const n=Math.round(Number(raw)*100);return Number.isSafeInteger(n)&&n>0?n:null;
 };
 function stored(){try{return JSON.parse(localStorage.getItem(LINK_KEY)||'null')||{pair:null,outbox:[],lowSince:{}}}catch{return {pair:null,outbox:[],lowSince:{}}}}
 let link=stored(),busy=false,timer;
 const store=()=>localStorage.setItem(LINK_KEY,JSON.stringify(link));
 const enabled=()=>!migrating&&!!link.pair;
 const auto=()=>localStorage.getItem(AUTO_KEY)==='yes';
 function panel(){
  if(document.getElementById('rituel-link-panel'))return;
  const settings=document.getElementById('settings-view');if(!settings)return;
  const root=document.createElement('section');root.className='panel';root.id='rituel-link-panel';
  // Afficher LINK avant les autres réglages sans modifier les flux de données.
  const firstPanel=settings.querySelector('.panel');
  if(firstPanel)settings.insertBefore(root,firstPanel);else settings.appendChild(root);
  root.addEventListener('click',e=>{
   const action=e.target.closest('[data-r-link]')?.dataset.rLink;
   if(action==='join')join();
   if(action==='enroll-hub')enrollHub().catch(err=>toast('LINK : '+err.message.slice(0,95)));
   if(action==='send-hub')sendHub().catch(err=>toast('LINK : '+String(err.message||err).slice(0,100)));
   if(action==='send')send().catch(err=>toast('Envoi impossible : '+err.message.slice(0,90)));
   if(action==='refresh')refresh();
   if(action==='test')test().catch(err=>toast('Test impossible : '+err.message.slice(0,90)));
  });
  root.addEventListener('change',e=>{if(e.target.id==='rituel-link-auto'){
    localStorage.setItem(AUTO_KEY,e.target.checked?'yes':'no');
    toast(e.target.checked?'Envoi automatique activé.':'Envoi manuel activé.');
    if(e.target.checked)queue();
  }});
  refresh();
 }
 function refresh(){
  const root=document.getElementById('rituel-link-panel');if(!root)return;
  if(migrating){
   root.innerHTML='<h2>Connexion à NEXUS</h2><p class="muted">Pour protéger tes données, la connexion utilise maintenant une adresse RITUEL isolée de NEXUS.</p>'+
   '<p class="muted"><strong>Migration sans perte :</strong> 1. Dans « Ton suivi », exporte une sauvegarde JSON. 2. Ouvre la nouvelle adresse RITUEL. 3. Importe le fichier JSON. 4. Vérifie le stock, puis active les notifications iPhone sur la nouvelle installation.</p>'+
   '<a class="primary-button" href="'+NEW_ORIGIN+'/" target="_blank" rel="noopener noreferrer">Ouvrir RITUEL sécurisé ↗</a>'+
   '<p class="push-fine">Ne désinstalle pas cette version avant d’avoir vérifié la restauration dans la nouvelle.</p>';
   return;
  }
  const count=(link.outbox||[]).length;
  root.innerHTML='<h2>LINK · Connexions</h2>'+ 
   '<p class="muted">LINK centralise les autorisations et les diagnostics. Les échanges chiffrés se poursuivent sans modifier tes produits ni tes clés.</p>'+ 
   '<a class="secondary-button" href="https://link-app.q9pfwtztsc.workers.dev/" target="_blank" rel="noopener noreferrer">Gérer dans LINK ↗</a>'+ 
   '<p class="push-fine">Les anciens jumelages sont conservés pour les échanges existants et le retour arrière.</p>'+ 
   '<details class="rituel-legacy-link"><summary>Ancien jumelage NEXUS · dépannage</summary><h3>NEXUS LINK · RITUEL</h3>'+
   '<p class="muted">Produits à racheter, rappels, achats réellement confirmés et suivi des routines vers NEXUS. Chiffré, avec validation à la réception.</p>'+
   (link.pair?
    '<div class="push-status">Jumelage actif · '+link.pair.scopes.length+' permission(s) · '+count+' proposition(s) envoyée(s)</div>'+
    '<button type="button" class="primary-button" data-r-link="send">Envoyer les propositions vers NEXUS ↗</button>'+
    '<button type="button" class="secondary-button" data-r-link="test">Envoyer un message test</button>'+
    '<div class="switch-row"><div><b>Envoi automatique (facultatif)</b><small>Quand RITUEL est ouverte et connectée. La validation dans NEXUS reste manuelle.</small></div><label class="switch"><input type="checkbox" id="rituel-link-auto" '+(auto()?'checked':'')+'><span></span></label></div>'+
    '<p class="push-fine">Pour changer les permissions ou révoquer, utilise NEXUS → Réglages → Applications & connexions.</p>':
    '<label class="field"><span>Code privé NEXUS LINK (NXL1…)</span><textarea id="rituel-link-code" rows="3" autocomplete="off" spellcheck="false" style="width:100%;resize:vertical" placeholder="Colle ton code de jumelage RITUEL"></textarea></label>'+
    '<button class="primary-button" type="button" data-r-link="join">Jumeler RITUEL avec NEXUS ↗</button>')+
   '<p class="push-fine">Les données ne sont jamais envoyées avant ton accord. Une hausse de stock ne signifie pas automatiquement un achat ; seules tes confirmations explicites peuvent devenir une dépense réelle.</p></details>'+
   '<div class="field"><label for="rituel-hub-code">Accès au centre LINK (invitation Rituel uniquement)</label>'+
   '<textarea id="rituel-hub-code" rows="2" autocomplete="off" spellcheck="false" placeholder="LHI1.rituel.…"></textarea></div>'+
   '<button type="button" class="secondary-button" data-r-link="enroll-hub">Inscrire Rituel dans LINK</button>'+
   '<div class="field"><label for="rituel-hub-scope">Type de données à envoyer à LINK</label>'+
   '<select id="rituel-hub-scope"><option value="routine_summary">Résumé des routines</option>'+
   '<option value="restock_task">Rappel de stock</option><option value="restock_purchase">Suggestion d’achat</option>'+
   '<option value="routine_schedule">Événement de routine</option><option value="product_paid">Achat réellement confirmé</option></select></div>'+
   '<button type="button" class="secondary-button" data-r-link="send-hub">Envoyer via LINK (chiffré)</button>'+
   '<p class="push-fine">Aucune donnée ne part sans autorisation de cette portée dans LINK. Nexus examine chaque proposition avant de l’ajouter.</p>';
 }
 async function enrollHub(){
  const code=document.getElementById('rituel-hub-code')?.value||'';
  if(!window.LinkHubOnboard)throw Error('MODULE_LINK_INDISPONIBLE');
  await window.LinkHubOnboard.enroll(code);
  toast('Rituel inscrit dans LINK. Les anciennes connexions restent en place.');
  refresh();
 }
 async function sendHub({scopes=null,quiet=false}={}){
  if(!enabled()||!link.pair)throw Error("Ancien jumelage chiffré nécessaire pour conserver les identifiants.");
  if(!window.LinkHubBus)throw Error("MODULE_TRANSPORT_LINK_INDISPONIBLE");
  if(busy)return {busy:true,sent:0,unchanged:0};
  const allowed=link.pair.scopes.filter(x=>["routine_summary","restock_task","restock_purchase","routine_schedule","product_paid"].includes(x));
  const selected=scopes==null?[document.getElementById("rituel-hub-scope")?.value||"routine_summary"]:
   [...new Set(scopes.filter(x=>allowed.includes(x)))];
  if(!selected.length)return {sent:0,unchanged:0};
  if(selected.some(scope=>!allowed.includes(scope)))throw Error("Cette portée n’est pas autorisée par le jumelage existant.");
  const entries=additions().filter(item=>selected.includes(item.scope)).slice(0,30);
  if(!entries.length){if(!quiet)toast("Aucune donnée de cette catégorie à transmettre.");return {sent:0,unchanged:0}}
  const journalKey="rituel_hub_revision_v1";
  let history={};try{history=JSON.parse(localStorage.getItem(journalKey)||"{}")||{}}catch{}
  const digest=async payload=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",
   new TextEncoder().encode(JSON.stringify(payload))))].map(b=>b.toString(16).padStart(2,"0")).join("");
  busy=true;let sent=0,unchanged=0,failed=0;
  try{
   for(const item of entries){
    const fingerprint=await digest(item.payload);
    const previous=history[item.id],legacy=link.outbox?.find(row=>row.id===item.id);
    if(previous?.fingerprint===fingerprint){unchanged++;continue}
    const base=legacy?(legacy.fingerprint===fingerprint?legacy.revision:legacy.revision+1):1;
    const revision=previous?Math.max(base,previous.revision+1):base;
    try{
     const result=await window.LinkHubBus.publish({pair:link.pair,from:"rituel",to:"nexus",
      contractId:"rituel-nexus",scope:item.scope,entityId:item.id,revision,
      payload:item.payload,schemaVersion:"rituel.proposal.v1"});
     if(result.accepted){
      history[item.id]={revision,fingerprint};
      localStorage.setItem(journalKey,JSON.stringify(history));sent++;
     }
    }catch(error){failed++;console.warn("RITUEL LINK Hub publish",error?.message||error)}
   }
   if(!quiet)toast(sent+" proposition(s) chiffrée(s) transmises à LINK, "+unchanged+" inchangée(s)"+(failed?", "+failed+" échec(s)":"")+".");
   return {sent,unchanged,failed};
  }finally{busy=false}
 }
 async function join(){
  const raw=document.getElementById('rituel-link-code')?.value;
  if(!raw)return toast('Colle le code NEXUS LINK.');
  let pair;
  try{
   pair=window.NexusLinkCore.readInvite(raw);
   if(pair.sourceApp!=='rituel')throw Error('CODE_AUTRE_APPLICATION');
   const status=await window.NexusLinkCore.status(pair);
   if(!status.connected||status.sourceApp!=='rituel')throw Error('Jumelage inactif.');
   if(!confirm('Jumeler RITUEL à NEXUS avec '+pair.scopes.length+' permissions ?'))return;
   link={pair,outbox:[],lowSince:link.lowSince||{}};store();refresh();
   toast('RITUEL et NEXUS sont jumelées.');
  }catch(e){toast('Code refusé : '+e.message.slice(0,75))}
 }
 function ledger(){
  return Array.isArray(state.purchaseLog)?state.purchaseLog:[];
 }
 function additions(){
  if(!enabled())return [];
  const scopes=new Set(link.pair.scopes),out=[];
  const add=(id,scope,dest,product,title,details='',date='',price=null,time='18:00')=>{
   if(!scopes.has(scope))return;
   const payload={type:'rituel.proposal.v1',sourceApp:'rituel',destination:dest,
     sourceId:str(id),title:str(title),game:str(product,100),details:str(details,500),
     date:validDate(date)?date:'',time,priceCents:Number.isSafeInteger(price)?price:null,
     currency:'EUR',isPaid:scope==='product_paid',paymentDate:scope==='product_paid'&&validDate(date)?date:'',season:null};
   out.push({id:scope+':'+id+':'+dest,scope,payload});
  };
  let changed=false;
  for(const p of products){
   const entry=stockEntry(p.id),low=window.RITUEL_ENHANCED?.needsRestock?.(p.id)??(entry.level!==null&&entry.level<=25&&entry.reserve===0);
   if(low){
    if(!link.lowSince[p.id]){link.lowSince[p.id]=today();changed=true;}
    const info='Niveau '+entry.level+' %, réserve '+entry.reserve+'. Prévision basée sur les relevés RITUEL, à confirmer.';
    add(p.id,'restock_purchase','purchases',p.name,'Racheter · '+p.name,info);
    add(p.id,'restock_task','tasks',p.name,'Vérifier le stock · '+p.name,info,link.lowSince[p.id]);
   }else if(link.lowSince[p.id]){delete link.lowSince[p.id];changed=true}
  }
  if(changed)store();
  for(const purchase of ledger()){
   if(!purchase?.id||!products.some(p=>p.id===purchase.productId)||!validDate(purchase.date)||
     !Number.isSafeInteger(purchase.priceCents)||purchase.priceCents<=0)continue;
   const p=products.find(p=>p.id===purchase.productId);
   add(purchase.id,'product_paid','transactions',p.name,'Achat RITUEL · '+p.name,
     'Achat renseigné explicitement dans RITUEL. Vérifier le montant et la date avant validation.',purchase.date,purchase.priceCents);
  }
  if(scopes.has('routine_schedule')){
   // A one-off proposal for the next occurrence. NEXUS must validate it; no duplicate recurrent push is created.
   for(const [name,label,time] of [['morning','du matin',state.times.morning],['evening','du soir',state.times.evening]]){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))continue;
    const day=today(),now=new Date(),hour=Number(time.slice(0,2)),minute=Number(time.slice(3));
    const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+(now.getHours()*60+now.getMinutes()>=hour*60+minute?1:0));
    const when=calendarDate(next);
    add('routine-'+name+'-'+when,'routine_schedule','events','Routine','Routine RITUEL '+label,
      'Événement ponctuel de routine, indépendant des push RITUEL.',when,null,time);
   }
  }
  if(scopes.has('routine_summary')){
   const stats=window.RITUEL_ENHANCED?.statsFor?.(7),t=stats?.totals;
   const body=t?'7 derniers jours : '+t.done+' soins essentiels sur '+t.total+' prévus. '+t.active+
     ' jours actifs et '+stats.streak+' jours de série.':'Suivi des routines dans RITUEL.';
   add('routine-summary','routine_summary','notes','Routine','RITUEL · Bilan de routine',body);
  }
  return out.slice(0,100);
 }
 async function preview(){
  const jobs=additions();
  const digest=async x=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(x)))]
    .map(b=>b.toString(16).padStart(2,'0')).join('');
  const pending=[];
  for(const proposal of jobs){
   const fingerprint=await digest(JSON.stringify(proposal.payload));
   const existing=link.outbox.find(x=>x.id===proposal.id);
   if(!existing||existing.fingerprint!==fingerprint)
    pending.push({...proposal,revision:Math.min((existing?.revision||0)+1,1000000),fingerprint});
  }
  return pending;
 }
 async function send(){
  if(!enabled())throw Error('Jumelage requis.');
  if(!navigator.onLine)throw Error('Internet indisponible.');
  if(busy)return;
  busy=true;let sent=0,failed=0;
  try{
   const proposals=(await preview()).slice(0,30);
   for(const p of proposals){
    try{
     await window.NexusLinkCore.publish(link.pair,{entityId:p.id,scope:p.scope,revision:p.revision,payload:p.payload});
     const ix=link.outbox.findIndex(x=>x.id===p.id);
     const entry={id:p.id,revision:p.revision,fingerprint:p.fingerprint,sentAt:new Date().toISOString()};
     if(ix>=0)link.outbox[ix]=entry;else link.outbox.push(entry);
     store();sent++;
    }catch(e){failed++;console.warn('RITUEL LINK publish',e.message)}
   }
   refresh();toast(sent+' proposition(s) envoyée(s)'+(failed?', '+failed+' erreur(s)':'')+'.');
  }finally{busy=false}
 }
 function queue(){
  if(!enabled()||!auto())return;
  clearTimeout(timer);
  timer=setTimeout(async()=>{
   timer=null;
   try{await sendHub({scopes:link.pair.scopes,quiet:true})}
   catch(error){
    // LINK is authoritative for automatic proposals. Keep the old relay
    // exclusively for the manual rescue control in the settings panel.
    console.warn("RITUEL LINK Hub différé (aucun repli automatique)",error?.message||error);
   }
  },1200);
 }
 async function test(){
  if(!enabled())throw Error('Jumelage requis.');
  await window.NexusLinkCore.publish(link.pair,{entityId:'rituel-test',revision:1,scope:link.pair.scopes[0],payload:{type:'test.ping',title:'RITUEL est connecté'}});
  toast('Message test envoyé vers NEXUS.');
 }
 function addPurchase(productId){
  const p=products.find(x=>x.id===productId);if(!p)return;
  const input=prompt('Prix réellement payé pour '+p.name+' (en €) ?');
  if(input==null)return;
  const cents=safeEuro(input);
  if(cents===null){toast('Montant invalide (ex. 9,99).');return}
  const date=prompt('Date réelle de l’achat (AAAA-MM-JJ)',today());
  if(!validDate(date)){toast('Date invalide.');return}
  if(!confirm('Enregistrer cet achat de '+p.name+' pour '+(cents/100).toFixed(2).replace('.',',')+' € ?'))return;
  if(!Array.isArray(state.purchaseLog))state.purchaseLog=[];
  state.purchaseLog.push({id:crypto.randomUUID(),productId,date,priceCents:cents});
  save();toast('Achat enregistré. Tu peux maintenant le proposer au Budget NEXUS.');
  refresh();queue();
 }
 function renderHistory(){
  if(migrating)return;
  const settings=document.getElementById('rituel-link-panel');
  if(!settings||!Array.isArray(state.purchaseLog)||!state.purchaseLog.length)return;
  const list=document.createElement('div');list.className='rituel-purchase-list';
  list.innerHTML='<h3>Achats enregistrés</h3>'+state.purchaseLog.slice(-8).reverse().map(p=>{
   const prod=products.find(x=>x.id===p.productId);
   return '<div class="rituel-purchase-entry"><span>'+safe(prod?.name||'Produit')+' · '+safe(p.date)+
    ' · '+(p.priceCents/100).toFixed(2)+' €</span><button type="button" data-purchase-remove="'+safe(p.id)+'">Supprimer</button></div>'
  }).join('');
  settings.appendChild(list);
  list.addEventListener('click',e=>{
   const id=e.target.closest('[data-purchase-remove]')?.dataset.purchaseRemove;
   if(!id||!confirm('Supprimer cette saisie d’achat dans RITUEL ? Cela ne supprime rien de NEXUS.'))return;
   state.purchaseLog=state.purchaseLog.filter(x=>x.id!==id);save();refresh();queue();
  });
 }
 // Extend stock cards only on the isolated origin; original GitHub Pages PWA stays intact.
 function addStockButtons(){
  const cards=document.querySelectorAll('#stock-list .stock-card');
  cards.forEach((card,i)=>{
   const p=products[i];if(!p||card.querySelector('[data-rituel-purchase]'))return;
   const b=document.createElement('button');
   b.className='secondary-button rituel-buy';b.type='button';b.dataset.rituelPurchase=p.id;
   b.textContent='J’ai acheté ce produit';card.appendChild(b);
  });
 }
 function start(){
  panel();
  if(migrating)return;
  const oldRenderStock=renderStock;
  renderStock=function(){oldRenderStock();addStockButtons()};
  const oldSave=save;
  save=function(){oldSave();queue();window.RituelGarage?.scheduleSync?.()};
  document.getElementById('stock-list')?.addEventListener('click',e=>{
   const btn=e.target.closest('[data-rituel-purchase]');if(btn)addPurchase(btn.dataset.rituelPurchase);
  });
  addStockButtons();
  const oldRefresh=refresh;
  refresh=function(){document.querySelector('#rituel-link-panel .rituel-purchase-list')?.remove();oldRefresh();renderHistory()};
  refresh();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  window.addEventListener('online',queue);
  window.addEventListener('focus',queue);
 }
 start();
 window.RITUEL_NEXUS=Object.freeze({preview,additions,send,sendHub,queue,enabled});
})();