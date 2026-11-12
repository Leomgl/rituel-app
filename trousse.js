'use strict';
/* RITUEL · TROUSSE v1.7
 * Local-first collection + reusable travel packing lists.
 * No calendar access, network writes or new Cloudflare storage is required.
 * Legacy routine products keep their IDs and their existing schedule untouched.
 */
(() => {
 const baseCount=products.length;
 const byId=id=>products.find(p=>p.id===id);
 const safe=htmlSafe;
 const clean=(v,max=180)=>String(v??'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max);
 const unique=values=>[...new Set(values)];
 const newId=()=>crypto.randomUUID?crypto.randomUUID():'t-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const seed={
  id:'trousse-silver-suede',name:'Silver Suede',brand:'Rituals',group:'Parfums',amount:'50 ml',
  why:"Eau de parfum · The Founder's Collection · cassis, daim et bois de santal.",
  use:'Vaporiser légèrement sur une peau propre, notamment le cou ou les poignets.',
  tip:'Éviter de frotter la peau après application. Conserver à l’écart de la chaleur et de la lumière.',
  shopUrl:'https://www.rituals.com/fr-fr/parfums/boise',ritualsSku:'1120736',tags:'parfum, sortie, week-end',
  travel:true
 };
 const initialKit={
  id:'trousse-kit-weekend',name:'Week-end · 2 nuits',
  productIds:['foam','face','anti','trousse-silver-suede'],
  extras:['Brosse à dents','Dentifrice','Peigne / brosse'],packed:{}
 };
 let selectedKit='trousse-kit-weekend',mode='catalog',search='',photoFor=null,pendingPhoto=null,editingId=null,editingKit=null;
 const q=id=>document.getElementById(id);
 const hasPhoto=src=>typeof src==='string'&&src.length<550000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src);
 const officialSkus={anti:'1120537',face:'1120289',shampoo:'1122488',serum:'1120271',aftershave:'1120290',sakura:'1118773',foam:'1119070',oil:'1120294',hydrator:'1116297','trousse-silver-suede':'1120736'};
 const officialImage=(p)=>{
  const sku=/^\d{7,10}$/.test(p?.ritualsSku||'')?p.ritualsSku:officialSkus[p?.id];
  if(!sku)return null;
  // Official Rituals product asset convention, not an uploaded or locally cached photo.
  return 'https://www.rituals.com/assets/'+sku+'/packshot/product%3ASquare?fmt=webp-alpha&resMode=sharp2';
 };
 const imageError=img=>{img.addEventListener('error',()=>{img.remove();},{once:true});};
 const data=()=>state.trousse;

 function ensure(){
  if(!state.trousse || typeof state.trousse!=='object' || Array.isArray(state.trousse)){
   state.trousse={items:[{...seed}],photos:{},kits:[{...initialKit,productIds:[...initialKit.productIds],extras:[...initialKit.extras]}],nexusTrips:[]};
   save();
  }
  const t=state.trousse;
  if(!Array.isArray(t.items))t.items=[];
  if(!Array.isArray(t.kits))t.kits=[];
  if(!t.photos || typeof t.photos!=='object' || Array.isArray(t.photos))t.photos={};
  if(!Array.isArray(t.nexusTrips))t.nexusTrips=[];
  return t;
 }
 function productData(p){
  return {
   id:clean(p.id,100),name:clean(p.name),brand:clean(p.brand,80),
   group:clean(p.group,45)||'Divers',amount:clean(p.amount,45),
   why:clean(p.why,350),use:clean(p.use,500),tip:clean(p.tip,500),
   shopUrl:safeShopURL(p.shopUrl),ritualsSku:/^\d{7,10}$/.test(p.ritualsSku||'')?p.ritualsSku:'',tags:clean(p.tags,220),travel:p.travel!==false
  };
 }
 function hydrate(){
  const t=ensure();
  products.splice(baseCount);
  const ids=new Set(products.map(p=>p.id));
  const sanitized=[];
  for(const raw of t.items.slice(0,100)){
   if(!raw||typeof raw!=='object')continue;
   const p=productData(raw);
   if(!p.id.startsWith('trousse-')||!p.name||ids.has(p.id))continue;
   ids.add(p.id);sanitized.push(p);products.push(p);
  }
  t.items=sanitized;
  if(category!=='Tous'&&!products.some(p=>p.group===category))category='Tous';
  if(!t.kits.some(k=>k.id===selectedKit))selectedKit=t.kits[0]?.id||null;
 }
 function imageOf(id){const src=data()?.photos?.[id];return hasPhoto(src)?src:officialImage(byId(id));}
 function decorateProducts(){
  const current=products.filter(p=>category==='Tous'||p.group===category);
  q('product-list')?.querySelectorAll('.product-card').forEach((card,index)=>{
   const p=current[index];if(!p)return;
   const head=card.querySelector('.product-head'),img=imageOf(p.id);
   if(img&&head){const photo=document.createElement('img');photo.src=img;photo.alt='Photo de '+p.name;photo.loading='lazy';photo.className='trousse-product-photo';imageError(photo);head.prepend(photo);}
   const actions=document.createElement('div');actions.className='trousse-card-actions';
   const photoButton=document.createElement('button');photoButton.type='button';photoButton.dataset.troussePhoto=p.id;photoButton.textContent=img?'Changer la photo':'Ajouter une photo';actions.append(photoButton);
   if(p.id.startsWith('trousse-')){
    const edit=document.createElement('button');edit.type='button';edit.dataset.trousseEdit=p.id;edit.textContent='Modifier';actions.append(edit);
   }
   card.append(actions);
   const visible=!search||[p.name,p.brand,p.group,p.tags].join(' ').toLocaleLowerCase('fr').includes(search);
   card.hidden=!visible;
  });
  window.RituelGarage?.decorate?.(current);
 }
 function decorateStock(){
  q('stock-list')?.querySelectorAll('.stock-card').forEach((card,index)=>{
   const p=products[index],img=p&&imageOf(p.id);
   if(!img)return;
   const head=card.querySelector('.stock-card-header');if(!head)return;
   const photo=document.createElement('img');photo.src=img;photo.alt='';photo.loading='lazy';photo.className='trousse-stock-photo';imageError(photo);head.insertBefore(photo,head.firstChild);
  });
 }
 const oldProducts=renderProducts;
 renderProducts=function(){oldProducts();decorateProducts()};
 const oldStock=renderStock;
 renderStock=function(){oldStock();decorateStock()};

 function refresh(){
  renderProducts();renderStock();renderKits();
 }
 function persist(){
  save();refresh();
 }
 function switchMode(next){
  mode=next;
  q('trousse-catalog').hidden=next!=='catalog';
  q('trousse-kits').hidden=next!=='kits';
  document.querySelectorAll('[data-trousse-tab]').forEach(button=>{
   const active=button.dataset.trousseTab===next;
   button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));
  });
  if(next==='kits')renderKits();
 }
 function show(dialog){if(dialog && !dialog.open)dialog.showModal();}
 function hide(dialog){if(dialog?.open)dialog.close();}
 function openProduct(id=null){
  editingId=id&&id.startsWith('trousse-')?id:null;
  const p=editingId?byId(editingId):null;
  const form=q('trousse-product-form');form.reset();
  q('trousse-product-title').textContent=p?'Modifier le produit':'Nouveau produit';
  for(const field of ['name','brand','group','amount','why','use','tip','shopUrl','ritualsSku','tags']){
   const input=form.elements.namedItem(field);if(input)input.value=p?.[field]||'';
  }
  form.elements.namedItem('travel').checked=p?.travel!==false;
  pendingPhoto=p?imageOf(p.id):null;
  setPhotoPreview(pendingPhoto);
  q('trousse-delete-product').hidden=!p;
  show(q('trousse-product-dialog'));
 }
 function setPhotoPreview(src){
  const img=q('trousse-photo-preview'),hint=q('trousse-photo-hint');
  if(img){img.hidden=!src;if(src)img.src=src;else img.removeAttribute('src');}
  if(hint)hint.textContent=src?'Photo enregistrée localement dans la sauvegarde JSON.':'Photo facultative · compression automatique.';
 }
 function photoBitmap(file){
  return new Promise((resolve,reject)=>{
   if(!file?.type.startsWith('image/')||file.size>15*1024*1024)return reject(Error('Choisis une image de moins de 15 Mo.'));
   const url=URL.createObjectURL(file),img=new Image();
   img.onload=()=>{
    URL.revokeObjectURL(url);
    const factor=Math.min(1,640/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*factor));
    canvas.height=Math.max(1,Math.round(img.naturalHeight*factor));
    const ctx=canvas.getContext('2d');if(!ctx)return reject(Error('Image indisponible.'));
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL('image/jpeg',0.7);
    if(!hasPhoto(data))return reject(Error('Image trop volumineuse après compression.'));
    resolve(data);
   };
   img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Impossible de lire cette photo.'))};
   img.src=url;
  });
 }
 async function photoChange(file,id){
  if(!file)return;
  try{
   const src=await photoBitmap(file);
   if(id){
    const t=ensure(),previous=t.photos[id];
    t.photos[id]=src;
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
    catch{if(previous)t.photos[id]=previous;else delete t.photos[id];throw Error('Stockage saturé. Exporte une sauvegarde et utilise une photo plus légère.');}
    refresh();toast('Photo enregistrée sur cet appareil.');
   }else{pendingPhoto=src;setPhotoPreview(src);}
  }catch(error){toast(error.message||'Photo non enregistrée.');}
 }
 function commitProduct(e){
  e.preventDefault();
  const form=e.currentTarget,fields=new FormData(form);
  const name=clean(fields.get('name'));if(!name){toast('Donne un nom au produit.');return}
  const rawUrl=clean(fields.get('shopUrl'),500),url=rawUrl?safeShopURL(rawUrl):'';
  if(rawUrl&&!url){toast('Utilise une adresse boutique HTTPS valide.');return}
  const id=editingId||'trousse-'+newId();
  const p=productData({
   id,name,brand:fields.get('brand'),group:fields.get('group'),amount:fields.get('amount'),
   why:fields.get('why'),use:fields.get('use'),tip:fields.get('tip'),shopUrl:url,ritualsSku:fields.get('ritualsSku'),
   tags:fields.get('tags'),travel:fields.has('travel')
  });
  const t=ensure(),index=t.items.findIndex(v=>v.id===id);
  const before=JSON.stringify(t);
  if(index>=0)t.items[index]=p;else t.items.push(p);
  if(pendingPhoto)t.photos[id]=pendingPhoto;
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
  catch{state.trousse=JSON.parse(before);toast('Stockage plein : produit non sauvegardé.');return}
  hydrate();refresh();hide(q('trousse-product-dialog'));
  toast(editingId?'Produit mis à jour.':'Produit ajouté à ta collection.');
 }
 function deleteProduct(){
  if(!editingId)return;
  const p=byId(editingId);
  if(!p||!confirm('Supprimer « '+p.name+' » de ta collection et de tes trousses ?'))return;
  const t=ensure();t.items=t.items.filter(x=>x.id!==editingId);
  delete t.photos[editingId];delete state.stock[editingId];delete state.stockHistory[editingId];
  t.kits.forEach(k=>{k.productIds=(k.productIds||[]).filter(id=>id!==editingId);});
  save();hydrate();refresh();hide(q('trousse-product-dialog'));
  toast('Produit retiré de la collection.');
 }
 function kitRows(kit){
  return [
   ...(kit.productIds||[]).map(id=>{const p=byId(id);return p?{key:'p:'+id,title:p.name,subtitle:p.group,photo:imageOf(id)}:null}).filter(Boolean),
   ...(kit.extras||[]).map((name,i)=>({key:'e:'+i,title:clean(name),subtitle:'À emporter',photo:null}))
  ];
 }
 function renderKits(){
  const area=q('trousse-kits');if(!area)return;
  const t=ensure();
  const list=t.kits.map(k=>{
   const rows=kitRows(k),count=rows.filter(row=>k.packed?.[row.key]).length,active=k.id===selectedKit;
   return '<button type="button" class="trousse-kit-card '+(active?'selected':'')+'" data-kit-open="'+safe(k.id)+'"><span class="trousse-kit-icon">✦</span><span class="trousse-kit-main"><b>'+safe(k.name)+'</b><small>'+count+' / '+rows.length+' préparés</small></span><span class="trousse-kit-chevron">›</span></button>';
  }).join('');
  const kit=t.kits.find(k=>k.id===selectedKit);
  let detail='';
  if(kit){
   const rows=kitRows(kit),done=rows.filter(x=>kit.packed?.[x.key]).length;
   detail='<div class="trousse-kit-detail"><div class="section-head"><div><span class="eyebrow">CHECKLIST</span><h2>'+safe(kit.name)+'</h2></div><strong>'+done+'/'+rows.length+'</strong></div>'+
    '<div class="trousse-progress"><span style="width:'+(rows.length?Math.round(done/rows.length*100):0)+'%"></span></div>'+
    (rows.length?rows.map(row=>'<label class="trousse-pack-row"><input type="checkbox" data-pack-key="'+safe(row.key)+'" '+(kit.packed?.[row.key]?'checked':'')+'>'+
     (row.photo?'<img src="'+row.photo+'" alt="">':'<span class="trousse-pack-icon">✓</span>')+
     '<span><b>'+safe(row.title)+'</b><small>'+safe(row.subtitle)+'</small></span></label>').join(''):'<p class="muted">Ajoute des produits ou des indispensables à cette trousse.</p>')+
    '<div class="trousse-kit-actions"><button type="button" data-kit-action="edit">Modifier</button><button type="button" data-kit-action="reset">Tout décocher</button><button type="button" data-kit-action="delete">Supprimer</button></div></div>';
  }
  area.innerHTML='<div class="trousse-section-head"><p>Prépare tes essentiels, coche ce qui est dans le sac et réutilise tes modèles.</p><button type="button" class="trousse-add" id="trousse-add-kit">+ Créer une trousse</button></div>'+
   '<div class="trousse-kit-list">'+(list||'<div class="trousse-empty">Aucune trousse pour le moment.</div>')+'</div>'+detail+
   '<p class="trousse-nexus-note"><b>NEXUS × RITUEL</b> · Les trousses restent disponibles hors ligne.</p>'+
   '<section id="trousse-nexus-panel" class="trousse-nexus-panel" aria-label="Voyages reçus de Nexus"></section>'+
   '<section id="trousse-garage-panel" class="trousse-nexus-panel" aria-label="Produits Rituel connectés à Garage"></section>';
  area.querySelectorAll('.trousse-pack-row img').forEach(imageError);
  window.RituelTravel?.render?.();
  window.RituelGarage?.render?.();
 }
 function openKit(id=null){
  editingKit=id;
  const kit=data().kits.find(k=>k.id===id);
  const form=q('trousse-kit-form');form.reset();
  q('trousse-kit-title').textContent=kit?'Modifier la trousse':'Créer une trousse';
  form.elements.namedItem('name').value=kit?.name||'';
  form.elements.namedItem('extras').value=(kit?.extras||[]).join('\n');
  const selected=new Set(kit?.productIds||[]);
  q('trousse-kit-products').innerHTML=products.filter(p=>p.travel!==false).map(p=>'<label class="trousse-kit-choice"><input type="checkbox" name="products" value="'+safe(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span><b>'+safe(p.name)+'</b><small>'+safe(p.group)+'</small></span></label>').join('');
  show(q('trousse-kit-dialog'));
 }
 function commitKit(e){
  e.preventDefault();
  const fd=new FormData(e.currentTarget),name=clean(fd.get('name'),90);
  if(!name){toast('Donne un nom à la trousse.');return}
  const ids=new Set(products.map(p=>p.id));
  const productIds=unique(fd.getAll('products').map(id=>String(id)).filter(id=>ids.has(id)));
  const extras=unique(String(fd.get('extras')||'').split(/\n/).map(t=>clean(t,100)).filter(Boolean)).slice(0,40);
  const kits=ensure().kits,index=kits.findIndex(x=>x.id===editingKit);
  const kit={id:editingKit||'kit-'+newId(),name,productIds,extras,packed:{}};
  if(index>=0)kits[index]=kit;else kits.push(kit);
  selectedKit=kit.id;save();renderKits();hide(q('trousse-kit-dialog'));switchMode('kits');toast('Trousse enregistrée.');
 }
 function kitAction(action){
  const t=ensure(),kit=t.kits.find(k=>k.id===selectedKit);if(!kit)return;
  if(action==='edit')return openKit(kit.id);
  if(action==='reset'){kit.packed={};save();renderKits();return}
  if(action==='delete'&&confirm('Supprimer cette trousse ?')){
   t.kits=t.kits.filter(k=>k.id!==kit.id);selectedKit=t.kits[0]?.id||null;save();renderKits();
  }
 }
 function onPack(key,checked){
  const kit=data().kits.find(k=>k.id===selectedKit);if(!kit)return;
  if(!kitRows(kit).some(row=>row.key===key))return;
  if(!kit.packed||typeof kit.packed!=='object')kit.packed={};
  if(checked)kit.packed[key]=true;else delete kit.packed[key];
  save();renderKits();
 }
 function attach(){
  q('trousse-add-product').addEventListener('click',()=>openProduct());
  q('trousse-search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('fr');decorateProducts()});
  document.querySelectorAll('[data-trousse-tab]').forEach(b=>b.addEventListener('click',()=>switchMode(b.dataset.trousseTab)));
  q('product-list').addEventListener('click',e=>{
   const photo=e.target.closest('[data-trousse-photo]'),edit=e.target.closest('[data-trousse-edit]');
   if(photo){photoFor=photo.dataset.troussePhoto;q('trousse-direct-photo').click();}
   if(edit)openProduct(edit.dataset.trousseEdit);
  });
  q('trousse-direct-photo').addEventListener('change',async e=>{
   const file=e.target.files?.[0];if(file&&photoFor)await photoChange(file,photoFor);
   e.target.value='';photoFor=null;
  });
  q('trousse-product-photo').addEventListener('change',async e=>{
   if(e.target.files?.[0])await photoChange(e.target.files[0],null);
   e.target.value='';
  });
  q('trousse-product-form').addEventListener('submit',commitProduct);
  q('trousse-kit-form').addEventListener('submit',commitKit);
  q('trousse-delete-product').addEventListener('click',deleteProduct);
  q('trousse-kits').addEventListener('click',e=>{
   const open=e.target.closest('[data-kit-open]'),action=e.target.closest('[data-kit-action]');
   if(open){selectedKit=open.dataset.kitOpen;renderKits();}
   if(action)kitAction(action.dataset.kitAction);
   if(e.target.closest('#trousse-add-kit'))openKit();
  });
  q('trousse-kits').addEventListener('change',e=>{
   if(e.target.matches('[data-pack-key]'))onPack(e.target.dataset.packKey,e.target.checked);
  });
  document.querySelectorAll('[data-trousse-close]').forEach(btn=>btn.addEventListener('click',()=>hide(q(btn.dataset.trousseClose))));
 }
 attach();hydrate();refresh();switchMode('catalog');
 window.RITUEL_TROUSSE=Object.freeze({
  hydrate:()=>{hydrate();renderKits()},
  kits:()=>data().kits.map(k=>({id:k.id,name:k.name,productIds:[...k.productIds],extras:[...k.extras]})),
  hasProduct:id=>!!byId(id)
 });
})();
