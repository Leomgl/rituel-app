/* RITUEL · dedicated NEXUS -> Trousse encrypted trip inbox.
   This pairing is separate from RITUEL -> NEXUS product/purchase sync. */
'use strict';
(()=>{
 const ORIGIN='https://rituel-web.q9pfwtztsc.workers.dev',KEY='rituel_travel_link_v1';
 const safe=htmlSafe,valid=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+'T12:00:00').getTime())&&new Date(d+'T12:00:00').toISOString().slice(0,10)===d;
 let pair=null,pending=[],busy=false;
 try{pair=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
 const isPair=p=>p&&p.sourceApp==='rituel'&&Array.isArray(p.scopes)&&p.scopes.length===1&&p.scopes[0]==='trip_context';
 if(!isPair(pair))pair=null;
 const t=()=>state.trousse;
 const entry=id=>t()?.nexusTrips?.find(x=>x.eventId===id);
 function validate(msg){
  if(msg.invalid||msg.scope!=='trip_context'||typeof msg.id!=='string'||!/^[-a-f0-9]{36}$/i.test(msg.id))return null;
  const p=msg.payload;
  if(!p||p.type!=='nexus.travel.v1'||p.destination!=='rituel'||!p.eventId||
   typeof p.eventId!=='string'||p.eventId.length>100||typeof p.title!=='string'||p.title.length>100||
   !valid(p.startDate)||!valid(p.endDate)||p.endDate<p.startDate||
   !Number.isSafeInteger(p.nights)||p.nights<0||p.nights>45||
   p.nights!==Math.round((Date.parse(p.endDate+'T12:00:00Z')-Date.parse(p.startDate+'T12:00:00Z'))/86400000)||
   !Number.isSafeInteger(msg.revision)||msg.revision<1)return null;
  return {id:msg.id,scope:msg.scope,revision:msg.revision,payload:p};
 }
 function render(){
  const root=document.getElementById('trousse-nexus-panel');if(!root)return;
  if(location.origin!==ORIGIN){
   root.innerHTML='<h3>NEXUS · Mes voyages</h3><p class="trousse-nexus-note">Les invitations chiffrées se reçoivent sur la version sécurisée RITUEL.</p>';
   return;
  }
  const proposals=pending.map(msg=>{
   const p=msg.payload,history=entry(p.eventId),update=history?.status==='accepted'&&history.revision<msg.revision;
   const choices=(t()?.kits||[]).map(k=>'<option value="'+safe(k.id)+'">'+safe(k.name)+'</option>').join('');
   return '<div class="trousse-travel-item"><div class="eyebrow">'+(update?'MISE À JOUR DE SÉJOUR':'SÉJOUR PROPOSÉ')+'</div>'+
    '<h4>'+safe(p.title||'Voyage')+'</h4><p>'+safe(p.startDate)+' → '+safe(p.endDate)+' · '+p.nights+' nuit(s)</p>'+
    '<label>Modèle de trousse <select data-travel-base="'+safe(msg.id)+'">'+choices+'</select></label>'+
    '<div class="trousse-travel-actions"><button type="button" data-travel-action="accept" data-id="'+safe(msg.id)+'">'+(update?'Actualiser ma trousse':'Préparer cette trousse')+'</button>'+
    '<button type="button" data-travel-action="dismiss" data-id="'+safe(msg.id)+'">Ignorer</button></div></div>';
  }).join('');
  root.innerHTML='<div class="trousse-travel-head"><span class="eyebrow">NEXUS × RITUEL</span><h3>Mes voyages</h3>'+
   '<p>Quand tu partages un séjour depuis l’agenda Nexus, prépare une trousse à partir de l’un de tes modèles. Rien n’est ajouté sans ton accord.</p></div>'+
   (pair?
    '<div class="trousse-nexus-status">Liaison voyage configurée · réception chiffrée</div>'+
    '<div class="trousse-travel-actions"><button type="button" data-travel-action="refresh">Recevoir les séjours</button>'+
    '<button type="button" data-travel-action="revoke">Dissocier</button></div>'+
    (proposals||'<p class="trousse-nexus-note">Aucune nouvelle proposition. Partage un événement « Voyage / week-end » depuis NEXUS puis actualise ici.</p>'):
    '<p class="trousse-nexus-note">Dans NEXUS → Réglages → Voyages vers RITUEL, crée la liaison, puis colle le code privé ci-dessous.</p>'+
    '<textarea id="rituel-travel-code" rows="3" placeholder="Code NXL1…" aria-label="Code privé de jumelage voyage"></textarea>'+
    '<button type="button" class="trousse-travel-connect" data-travel-action="join">Jumeler mes voyages</button>')+
   '<p class="trousse-nexus-note">Tes produits et cases cochées restent dans RITUEL. Le relais reçoit uniquement des messages chiffrés.</p>';
 }
 async function join(){
  const code=document.getElementById('rituel-travel-code')?.value?.trim();
  if(!code)return toast('Colle le code privé généré dans Nexus.');
  try{
   const next=window.NexusLinkCore.readInvite(code);
   if(!isPair(next))throw Error('Ce code ne concerne pas les voyages.');
   const status=await window.NexusLinkCore.status(next);
   if(!status.connected||status.sourceApp!=='rituel'||status.scopes?.length!==1||status.scopes[0]!=='trip_context')
    throw Error('Code non autorisé pour les voyages.');
   if(!confirm('Autoriser RITUEL à recevoir les séjours explicitement partagés depuis Nexus ?'))return;
   localStorage.setItem(KEY,JSON.stringify(next));pair=next;pending=[];render();toast('Liaison voyage activée.');await refresh();
  }catch(e){toast('Jumelage refusé : '+String(e.message).slice(0,80))}
 }
 async function refresh(){
  if(!pair||busy)return;
  if(!navigator.onLine){toast('Internet requis pour recevoir les séjours.');return}
  busy=true;
  try{
   const messages=await window.NexusLinkCore.inbox(pair),received=[];
   for(const msg of messages){
    const item=validate(msg);if(!item)continue;
    const history=entry(item.payload.eventId);
    if(history&&history.revision>=item.revision){
     await window.NexusLinkCore.acknowledge(pair,item.id);continue;
    }
    // Last revision wins; reject duplicates from previous partial attempts.
    const i=received.findIndex(v=>v.payload.eventId===item.payload.eventId);
    if(i<0)received.push(item);
    else if(received[i].revision<item.revision)received[i]=item;
   }
   pending=received;toast(pending.length+' séjour(s) à examiner.');
  }catch(e){toast('Réception impossible : '+String(e.message).slice(0,90))}
  finally{busy=false;render()}
 }
 async function resolve(id,action){
  if(!pair||busy)return;
  const msg=pending.find(x=>x.id===id);if(!msg)return;
  const {payload:p}=msg,old=entry(p.eventId);
  if(action==='accept'&&!confirm('Créer ou actualiser ta trousse pour « '+p.title+' » ?'))return;
  const selector=[...document.querySelectorAll('[data-travel-base]')].find(x=>x.dataset.travelBase===id);
  const template=t().kits.find(k=>k.id===selector?.value)||t().kits[0];
  if(action==='accept'&&!template){toast('Crée d’abord un modèle de trousse.');return}
  busy=true;
  try{
   if(!Array.isArray(t().nexusTrips))t().nexusTrips=[];
   if(action==='accept'){
    const kit=old?.kitId&&t().kits.find(k=>k.id===old.kitId);
    if(kit){
     // Never overwrite user-packed items on revised travel dates.
     kit.tripRef={eventId:p.eventId,revision:msg.revision,startDate:p.startDate,endDate:p.endDate};
    }else{
     const id='kit-trip-'+crypto.randomUUID();
     const next={id,name:('Voyage · '+p.title).slice(0,90),productIds:[...template.productIds],
      extras:[...template.extras],packed:{},
      tripRef:{eventId:p.eventId,revision:msg.revision,startDate:p.startDate,endDate:p.endDate}};
     t().kits.push(next);
    }
    const newKit=kit||t().kits[t().kits.length-1];
    const record={eventId:p.eventId,revision:msg.revision,status:'accepted',kitId:newKit.id};
    if(old)Object.assign(old,record);else t().nexusTrips.push(record);
   }else{
    const record={eventId:p.eventId,revision:msg.revision,status:'dismissed',kitId:old?.kitId||''};
    if(old)Object.assign(old,record);else t().nexusTrips.push(record);
   }
   // Verify write before ACK: never delete a server message before local persistence.
   localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
   pending=pending.filter(x=>x.id!==id);
   window.RITUEL_TROUSSE?.hydrate();
   renderKits();
   try{await window.NexusLinkCore.acknowledge(pair,id);}catch{ /* revisit + idempotent ACK next refresh */ }
   toast(action==='accept'?'Ta trousse de voyage est prête.':'Suggestion ignorée.');
  }catch(e){toast('Enregistrement impossible : '+String(e.message).slice(0,85))}
  finally{busy=false;render()}
 }
 async function revoke(){
  if(!pair||!confirm('Révoquer uniquement la réception de voyages Nexus ? Les trousses et l’autre lien RITUEL restent intacts.'))return;
  try{await window.NexusLinkCore.revoke(pair);}
  catch(e){if(e.message!=='UNAUTHORIZED'){toast('Révocation impossible : '+e.message.slice(0,70));return}}
  localStorage.removeItem(KEY);pair=null;pending=[];render();toast('Liaison voyage retirée.');
 }
 function init(){
  const root=document.getElementById('trousse-kits');if(!root)return;
  root.addEventListener('click',e=>{
   const target=e.target.closest('[data-travel-action]');if(!target)return;
   const action=target.dataset.travelAction,id=target.dataset.id;
   if(action==='join')join();if(action==='refresh')refresh();
   if(action==='accept'||action==='dismiss')resolve(id,action);
   if(action==='revoke')revoke();
  });
  render();
 }
 window.RituelTravel=Object.freeze({render,init,validate,isLinked:()=>!!pair});
 init();
})();