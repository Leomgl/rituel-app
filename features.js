'use strict';
/* RITUEL v1.5 — optional, local-first features.
   Keeps the working v1.4 routine and push logic intact. */
(() => {
  const originalSetStock=setStock;
  const originalRenderStock=renderStock;
  const originalRenderSettings=renderSettings;
  const originalRender=render;
  const originalNavigate=navigate;
  const originalPushPreferences=pushPreferences;

  let statsDays=7;
  const isoDate=d=>calendarDate(d);
  const parseISO=d=>{
    const parts=d.split('-').map(Number);
    return new Date(parts[0],parts[1]-1,parts[2]);
  };
  const numberOfDays=(a,b)=>Math.round((Date.UTC(...a.split('-').map((v,i)=>i===1?Number(v)-1:Number(v)))-Date.UTC(...b.split('-').map((v,i)=>i===1?Number(v)-1:Number(v))))/86400000);
  const nicePlural=(value,singular,plural)=>value+' '+(value===1?singular:plural);
  const historyFor=id=>Array.isArray(state.stockHistory[id])?state.stockHistory[id]:[];

  function estimateStock(id,stock=stockEntry(id)){
    const history=historyFor(id).filter(p=>p && /^\d{4}-\d{2}-\d{2}$/.test(p.date) && Number.isFinite(p.level))
       .sort((a,b)=>a.date.localeCompare(b.date));
    if(stock.level===null||stock.level===0||history.length<2)return null;
    const first=history[0],last=history[history.length-1];
    const elapsed=numberOfDays(last.date,first.date),consumed=first.level-last.level;
    if(elapsed<1 || consumed<=0)return null;
    const perDay=consumed/elapsed;
    return {days:Math.ceil(stock.level/perDay),samples:history.length};
  }
  function needsRestock(id){
    const st=stockEntry(id);
    if(st.level===null||st.reserve>0)return false;
    const forecast=estimateStock(id,st);
    return st.level<=25||(forecast!==null && forecast.days<=7);
  }
  function forecastLine(id,st){
    if(st.level===null)return 'Renseigne d’abord le niveau de ton flacon.';
    if(st.level===0)return 'Flacon terminé · pense à indiquer tes éventuelles réserves.';
    const forecast=estimateStock(id,st);
    if(!forecast)return 'Autonomie à estimer après deux relevés sur des jours différents.';
    if(forecast.days>365)return 'Autonomie indicative : plus d’un an (consommation très faible).';
    return 'Autonomie indicative : environ '+nicePlural(forecast.days,'jour restant','jours restants')+' · '+nicePlural(forecast.samples,'relevé','relevés')+'.';
  }
  // Update the underlying level history before the existing setStock() saves state.
  setStock=function(id,change){
    if(change && Object.prototype.hasOwnProperty.call(change,'level')){
      const previous=stockEntry(id).level,next=Number(change.level);
      if(Number.isFinite(next) && next!==previous){
        const day=isoDate(localToday());
        const existing=historyFor(id).filter(p=>p && p.date!==day);
        // A rising level indicates a refill / a newly opened bottle.
        const history=previous!==null && next>previous ? [] : existing;
        history.push({date:day,level:next});
        state.stockHistory[id]=history.slice(-60);
      }
    }
    originalSetStock(id,change);
  };
  renderStock=function(){
    originalRenderStock();
    const list=el('stock-list');
    const cards=list.querySelectorAll('.stock-card');
    let toBuy=0;
    cards.forEach((card,i)=>{
      const product=products[i];
      if(!product)return;
      const stock=stockEntry(product.id);
      const forecast=estimateStock(product.id,stock);
      const isLow=needsRestock(product.id);
      if(isLow)toBuy++;
      const text=forecastLine(product.id,stock);
      const paragraph=document.createElement('p');
      paragraph.className='stock-forecast'+(forecast?' known':'');
      paragraph.textContent=text;
      const reserve=card.querySelector('.stock-reserve');
      if(reserve)card.insertBefore(paragraph,reserve);
      if(isLow && stock.level>25){
        const badge=card.querySelector('.stock-state');
        if(badge){badge.textContent='À prévoir bientôt';badge.classList.add('is-low');}
      }
    });
    const overview=el('stock-overview').querySelectorAll('.stock-stat');
    if(overview.length>1){
      overview[1].querySelector('strong').textContent=String(toBuy);
      overview[1].querySelector('span').textContent='À prévoir';
    }
  };

  function firstDayChecked(){
    return Object.entries(state.checks).filter(([key,v])=>v && /^\d{4}-\d{2}-\d{2}:/.test(key))
      .map(([key])=>key.slice(0,10)).sort()[0]||null;
  }
  function dailyDetails(day){
    const routinesOfDay=routines(day),key=isoDate(day);
    const summary=period=>{
      const required=routinesOfDay[period].filter(t=>!t.optional);
      const done=required.filter(t=>!!state.checks[key+':'+t.id]).length;
      return {total:required.length,done};
    };
    const morning=summary('morning'),evening=summary('evening');
    return {morning,evening,done:morning.done+evening.done,total:morning.total+evening.total};
  }
  function statsFor(days=7){
    const today=localToday(),first=firstDayChecked();
    const totals={done:0,total:0,active:0,perfect:0,morningDone:0,morningTotal:0,eveningDone:0,eveningTotal:0};
    const rows=[];
    for(let i=days-1;i>=0;i--){
      const date=onDate(today,-i),key=isoDate(date),tracked=!!first&&key>=first;
      const detail=dailyDetails(date);
      const percent=tracked&&detail.total?Math.round(100*detail.done/detail.total):0;
      rows.push({date:key,day:date.getDate(),tracked,percent,today:i===0});
      if(tracked){
        totals.done+=detail.done;totals.total+=detail.total;
        totals.morningDone+=detail.morning.done;totals.morningTotal+=detail.morning.total;
        totals.eveningDone+=detail.evening.done;totals.eveningTotal+=detail.evening.total;
        if(detail.done>0)totals.active++;
        if(detail.total>0&&detail.done===detail.total)totals.perfect++;
      }
    }
    let streak=0;
    if(first){
      let date=localToday();
      const now=dailyDetails(date);
      if(now.total===0||now.done!==now.total)date=onDate(date,-1);
      for(let i=0;i<365 && isoDate(date)>=first;i++,date=onDate(date,-1)){
        const value=dailyDetails(date);
        if(value.total===0||value.done!==value.total)break;
        streak++;
      }
    }
    return {first,rows,totals,streak};
  }
  function renderStats(){
    const output=el('stats-summary'),calendar=el('stats-calendar'),periods=el('stats-periods');
    if(!output||!calendar||!periods)return;
    const details=statsFor(statsDays),t=details.totals;
    const rate=t.total?Math.round(100*t.done/t.total):null;
    const card=(name,value,dark)=>'<div class="stats-summary-card'+(dark?' strong':'')+'"><span>'+name+'</span><strong>'+value+'</strong></div>';
    output.innerHTML='<div class="stats-summary-grid">'+
      card('Soins essentiels effectués',rate===null?'—':rate+' %',true)+
      card('Jours avec des soins',t.active,false)+
      card('Jours entièrement terminés',t.perfect,false)+
      card('Série de jours complets',details.streak,false)+'</div>';
    calendar.innerHTML=details.rows.map(item=>{
      const strength=!item.tracked?'pre':String(item.percent===0?0:item.percent<25?1:item.percent<50?2:item.percent<80?3:4);
      return '<div class="stats-day'+(item.today?' is-today':'')+'" title="'+item.date+' : '+(item.tracked?item.percent+' %':'avant le suivi')+'">'+
        '<span>'+item.day+'</span><i data-strength="'+strength+'" aria-label="'+item.date+' : '+(item.tracked?item.percent+' %':'non suivi')+'"></i></div>';
    }).join('');
    const row=(name,done,total)=>{
      const pct=total?Math.round(100*done/total):0;
      return '<div class="stats-period-row"><div class="stats-period-line"><span>'+name+'</span><strong>'+(total?pct+' %':'—')+'</strong></div>'+
        '<div class="stats-progress-track"><div class="stats-progress-fill" style="width:'+pct+'%"></div></div></div>';
    };
    periods.innerHTML=row('☀️ Routine du matin',t.morningDone,t.morningTotal)+row('🌙 Routine du soir',t.eveningDone,t.eveningTotal);
    el('stats-period-caption').textContent=statsDays+' derniers jours';
    document.querySelectorAll('[data-stats-period]').forEach(b=>{
      const selected=Number(b.dataset.statsPeriod)===statsDays;
      b.classList.toggle('active',selected);
      b.setAttribute('aria-pressed',String(selected));
    });
  }

  pushPreferences=function(){
    return {...originalPushPreferences(),nudgeMinutes:state.nudgeMinutes};
  };
  renderSettings=function(){
    originalRenderSettings();
    el('nudge-delay').value=String(state.nudgeMinutes);
  };
  render=function(){originalRender();renderStats();};
  navigate=function(where){originalNavigate(where);if(where==='stats')renderStats();};

  el('stats-view').addEventListener('click',event=>{
    const button=event.target.closest('[data-stats-period]');
    if(!button)return;
    statsDays=Number(button.dataset.statsPeriod)===30?30:7;
    renderStats();
  });
  el('nudge-delay').addEventListener('change',event=>{
    const value=Number(event.target.value);
    if(![30,45,60,90].includes(value))return;
    state.nudgeMinutes=value;save();syncPushPreferences();
  });
  // Initial app render and event binding ran in app.js; enhance the existing views.
  renderStock();renderStats();renderSettings();
  window.RITUEL_ENHANCED={version:'1.5',statsFor,estimateStock,needsRestock};
})();
