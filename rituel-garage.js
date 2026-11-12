/* RITUEL x GARAGE v1 — opt-in, encrypted, stock remains in RITUEL. */
'use strict';
(()=>{
 const KEY='rituel_garage_link_v1';
 const trousse=()=>state.trousse||{};
 const ensure=()=>{if(!state.trousse)state.trousse={items:[],photos:{},kits:[],nexusTrips:[]};if(!state.trousse.garage)state.trousse.garage={places:[],positions:{},revision:0,pending:[]};return state.trousse.garage;};
 const clean=(x,n=130)=>String(x??'').trim().slice(0,n);
 const safe=htmlSafe;
 const online=()=>navigator.onLine&&!!window.NexusLinkCore;
 const source=()=>window.NexusLinkCore;
 const item=id=>products.find(p=>p.id===id);
 let pairs=null,busy=false,status='',syncTimer;
 try{pairs=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 function display(s){status=s;render();}
 function decode(value){
  const raw=clean(value,5000);
  if(!raw.startsWith('GRL1.'))throw Error('Format du code incorrect');
  const b=raw.slice(5).replace(/-/g,'+').replace(/_/g,'/');
  const obj=JSON.parse(atob(b+'='.repeat((4-b.length%4)%4)));
  if(!obj?.toGarage||!obj?.toRituel)throw Error('Code incomplet');
  const toInvite=p=>'NXL1.'+btoa(JSON.stringify(p)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const toGarage=source().readInvite(toInvite(obj.toGarage)),toRituel=source().readInvite(toInvite(obj.toRituel));
  if(toGarage.sourceApp!=='garage'||toGarage.scopes.join(',')!=='rituel_catalog,rituel_location_request'||
     toRituel.sourceApp!=='garage'||toRituel.scopes.join(',')!=='garage_locations')throw Error('Permissions incorrectes');
  return {toGarage,toRituel,catalogLedger:{},requestLedger:{}};
 }
 function render(){
  const panel=document.getElementById('trousse-garage-panel');if(!panel)return;
  const count=Object.keys(ensure().positions||{}).length;
  panel.innerHTML='<div class="trousse-travel-head"><span class="eyebrow">RITUEL × GARAGE</span><h3>Mes objets et leurs lieux</h3><p>Rituel garde tes stocks et routines. Garage conserve les emplacements et les ensembles. Les changements de lieu sont transmis de façon chiffrée quand les apps sont ouvertes.</p></div>'+
   (pairs?'<div class="trousse-nexus-status">Connecté · '+count+' produit(s) localisés</div><div class="trousse-travel-actions"><button type="button" data-rgarage="sync">Synchroniser avec Garage</button><button type="button" data-rgarage="unlink">Dissocier</button></div>':
    '<label class="trousse-garage-label">Code privé copié depuis Garage → Réglages<textarea id="rituel-garage-code" rows="4" placeholder="GRL1…"></textarea></label><button type="button" class="trousse-travel-connect" data-rgarage="join">Connecter mes produits à Garage</button>')+
   '<p class="trousse-nexus-note">Ni stock, ni historique de routines, ni photo personnelle ne sont envoyés. Une demande de déplacement peut être en attente si Garage est fermée.</p>'+
   (status?'<p class="trousse-nexus-note" role="status">'+safe(status)+'</p>':'');
 }
 function decorate(current=products.filter(p=>category==='Tous'||p.group===category)){
  if(!pairs)return;
  const garage=ensure(),places=garage.places||[],loc=garage.positions||{};
  document.querySelectorAll('#product-list .product-card').forEach((card,index)=>{
   const p=current[index];if(!p)return;
   card.querySelector('.rituel-garage-place')?.remove();
   const position=loc[p.id],parent=document.createElement('div');
   parent.className='rituel-garage-place';
   if(!places.length){parent.textContent='Garage : synchronise pour afficher les lieux.';card.append(parent);return;}
   const label=document.createElement('label');label.textContent='Emplacement Garage';
   const select=document.createElement('select');select.dataset.rgarageProduct=p.id;
   select.disabled=ensure().pending.some(x=>x.productId===p.id);
   for(const place of places){
    const option=document.createElement('option');option.value=place.id;
    const parent=places.find(q=>q.id===place.parentId);
    option.textContent=(parent?parent.name+' › ':'')+place.name;
    if(place.id===position?.placeId)option.selected=true;
    select.append(option);
   }
   if(position&&!places.some(q=>q.id===position.placeId)){const option=document.createElement('option');option.value='';option.textContent='Lieu inconnu';option.selected=true;select.prepend(option);}
   label.append(select);parent.append(label);
   if(ensure().pending.some(x=>x.productId===p.id)){const small=document.createElement('small');small.textContent='Changement en attente de Garage';parent.append(small);}
   card.append(parent);
  });
 }
 async function join(){
  if(pairs||!online())return display('Connexion nécessaire pour le jumelage.');
  try{
   const code=document.getElementById('rituel-garage-code')?.value||'',next=decode(code);
   const a=await source().status(next.toGarage),b=await source().status(next.toRituel);
   if(!a.connected||!b.connected||a.sourceApp!=='garage'||b.sourceApp!=='garage')throw Error('Jumelage invalide');
   if(!confirm('Partager les noms de tes produits Rituel et permettre leurs déplacements depuis Garage ? Aucun stock ni photo ne sera envoyé.'))return;
   pairs=next;localStorage.setItem(KEY,JSON.stringify(pairs));
   display('Connexion créée. Synchronisation des produits lancée.');await sync();
  }catch(e){display('Connexion refusée : '+clean(e.message,95));}
 }
 async function unlink(){
  if(!pairs||!confirm('Dissocier Rituel et Garage ? Les données des deux apps sont conservées.'))return;
  try{await Promise.allSettled([source().revoke(pairs.toGarage),source().revoke(pairs.toRituel)]);}
  finally{pairs=null;localStorage.removeItem(KEY);display('Connexion révoquée. Aucun produit supprimé.');}
 }
 const fingerprint=async data=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(data))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 function catalogPages(){
  const records=products.slice(0,150).map(p=>({id:clean(p.id,100),name:clean(p.name,140),brand:clean(p.brand,80),group:clean(p.group,45),amount:clean(p.amount,45)}));
  const rows=[];for(let i=0;i<records.length;i+=15)rows.push(records.slice(i,i+15));
  return rows.length?rows:[[]];
 }
 async function sendCatalog(){
  const pages=catalogPages();let count=0;
  for(let i=0;i<pages.length;i++){
   const payload={type:'rituel.catalog.v1',products:pages[i],page:i,total:pages.length};
   const fp=await fingerprint(payload),old=pairs.catalogLedger?.[i];
   if(old?.hash===fp)continue;
   const revision=(old?.revision||0)+1;
   await source().publish(pairs.toGarage,{entityId:'rituel-products:'+i,scope:'rituel_catalog',revision,payload});
   pairs.catalogLedger[i]={hash:fp,revision};localStorage.setItem(KEY,JSON.stringify(pairs));count++;
  }
  return count;
 }
 async function flushLocationRequests(){
  const ledger=ensure().pending||[];let sent=0;
  for(const r of ledger){
   if(r.sent)continue;
   await source().publish(pairs.toGarage,{entityId:'rituel-place:'+r.productId,scope:'rituel_location_request',revision:r.revision,
    payload:{type:'rituel.location.request.v1',productId:r.productId,placeId:r.placeId,expectedRevision:r.expectedRevision}});
   r.sent=true;save();sent++;
  }
  return sent;
 }
 function validate(msg){
  const p=msg.payload;
  return !msg.invalid&&msg.scope==='garage_locations'&&p?.type==='garage.locations.v1'&&
   Number.isSafeInteger(p.revision)&&p.revision>0&&
   Number.isSafeInteger(p.part)&&Number.isSafeInteger(p.total)&&p.part>=0&&p.total>=1&&p.total<=40&&p.part<p.total&&
   Array.isArray(p.places)&&p.places.length<=15&&Array.isArray(p.positions)&&p.positions.length<=22;
 }
 async function receiveLocations(){
  const entries=await source().inbox(pairs.toRituel);
  const all=entries.filter(validate),current=ensure();
  for(const msg of all.filter(x=>x.payload.revision<=current.revision))await source().acknowledge(pairs.toRituel,msg.id);
  const future=all.filter(x=>x.payload.revision>current.revision);
  if(!future.length)return 0;
  const latest=Math.max(...future.map(x=>x.payload.revision));
  const pages=future.filter(x=>x.payload.revision===latest).sort((a,b)=>a.payload.part-b.payload.part);
  if(!pages.length||pages.length!==pages[0].payload.total||new Set(pages.map(x=>x.payload.part)).size!==pages.length)return 0;
  const places=pages.flatMap(x=>x.payload.places),positions=pages.flatMap(x=>x.payload.positions);
  if(places.some(x=>!x||typeof x.id!=='string'||typeof x.name!=='string'||(x.parentId!==null&&typeof x.parentId!=='string'))||
     positions.some(x=>!x||typeof x.productId!=='string'||typeof x.placeId!=='string'||!Number.isSafeInteger(x.revision)))return 0;
  const previous=ensure();
  const next={places,positions:Object.fromEntries(positions.map(x=>[x.productId,{placeId:x.placeId,revision:x.revision}])),revision:latest,
   pending:previous.pending.filter(req=>{
    const p=positions.find(x=>x.productId===req.productId);
    return !p||p.revision<=req.expectedRevision;
   })};
  state.trousse.garage=next;save();
  for(const msg of pages)await source().acknowledge(pairs.toRituel,msg.id);
  for(const msg of future.filter(x=>x.payload.revision<latest))await source().acknowledge(pairs.toRituel,msg.id);
  renderProducts();render();
  return pages.length;
 }
 async function sync(){
  if(busy||!pairs)return;
  if(!online())return display('Synchronisation reportée : hors connexion.');
  busy=true;try{
   const outgoing=await sendCatalog(),requests=await flushLocationRequests(),incoming=await receiveLocations();
   display('Échanges : '+outgoing+' lot(s) produits, '+requests+' changement(s), '+incoming+' lot(s) d’emplacements reçus.');
  }catch(e){display('Synchronisation incomplète : '+clean(e.message,92));}
  finally{busy=false;}
 }
 function scheduleSync(){if(!pairs||!online())return;clearTimeout(syncTimer);syncTimer=setTimeout(sync,1500);}
 async function changePlace(id,placeId){
  const p=item(id),current=ensure().positions[id];
  if(!pairs||!p||!current)return;
  if(!ensure().places.some(x=>x.id===placeId))return toast('Emplacement inconnu dans Garage.');
  if(ensure().pending.some(x=>x.productId===id))return toast('Ce produit attend déjà une confirmation Garage.');
  const old=pairs.requestLedger?.[id]||0,revision=old+1;
  pairs.requestLedger[id]=revision;localStorage.setItem(KEY,JSON.stringify(pairs));
  ensure().pending.push({productId:id,placeId,expectedRevision:current.revision,revision,sent:false});save();
  renderProducts();scheduleSync();toast('Déplacement demandé à Garage. Il sera validé à sa prochaine ouverture.');
 }
 document.addEventListener('click',e=>{const btn=e.target.closest('[data-rgarage]');if(!btn)return;e.preventDefault();
  const actions={join,unlink,sync};actions[btn.dataset.rgarage]?.().catch(err=>display(clean(err.message,90)));
 });
 document.addEventListener('change',e=>{
  const x=e.target.closest('[data-rgarage-product]');if(!x)return;
  changePlace(x.dataset.rgarageProduct,x.value).catch(err=>toast('Déplacement indisponible : '+clean(err.message,80)));
 });
 window.addEventListener('online',scheduleSync);
 window.addEventListener('focus',scheduleSync);
 window.RituelGarage=Object.freeze({render,decorate,sync,scheduleSync});
 if(pairs)scheduleSync();
})();