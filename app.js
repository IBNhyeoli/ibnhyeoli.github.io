'use strict';
const $ = id => document.getElementById(id);
const key = 'is-route-guide-v2';
let state = {};
let storageAvailable = true;
try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) state = saved; } catch { storageAvailable = false; }
try { if (!localStorage.getItem(key)) { const old = JSON.parse(localStorage.getItem('sui-route-guide-v1') || '{}'); for (const [id,value] of Object.entries(old || {})) if (Array.isArray(value)) state['sui:'+id]=value; } } catch {}
let theme=themes[0];
let active=theme.routes[0];
function readHash(){const legacy=location.hash.match(/^#ending-([1-5])$/);const parts=location.hash.slice(1).split('/');const found=themes.find(t=>t.id===(legacy?'sui':parts[0]));if(found){theme=found;active=theme.routes.find(r=>r.id===(legacy?legacy[1]:parts[1]))||theme.routes[0];}}
readHash();
function routeKey(){return theme.id+':'+active.id;}
function navigate(){try{history.replaceState(null,'','#'+theme.id+'/'+active.id);}catch{}render();}
function save() { try {localStorage.setItem(key, JSON.stringify(state));} catch {storageAvailable=false;} updateStorageNote(); }
function updateStorageNote() {$('storage-note').textContent = storageAvailable ? '체크 기록은 이 브라우저에 저장됩니다.' : '브라우저 저장을 사용할 수 없어 현재 화면에서만 체크가 유지됩니다.';}
function checked(index) {return Array.isArray(state[routeKey()]) && state[routeKey()].includes(index);}
function progress() { const count = active.steps.filter((_,i)=>checked(i)).length; $('progress').max=active.steps.length; $('progress').value=count; $('progress-label').textContent = count === active.steps.length ? '모든 항목 체크 완료 · 실제 클리어 여부는 게임에서 확인하세요.' : `${count} / ${active.steps.length} 완료`; }
function render(){
 document.body.dataset.theme=theme.id;
 $('themes').innerHTML=themes.map(t=>`<button type="button" data-theme="${t.id}" aria-pressed="${t.id===theme.id}"><small>IS${t.number}</small><strong>${t.short}</strong></button>`).join('');
 $('theme-title').textContent=theme.title;
 $('theme-meta').textContent=`통합전략 0${theme.number} / ENDING ROUTES`;
 $('ending-count').textContent=`01 — 0${theme.routes.length}`;
 $('endings').style.setProperty('--count',theme.routes.length);
 $('endings').innerHTML = theme.routes.map(r=>`<button type="button" data-route="${r.id}" aria-pressed="${r.id===active.id}"><small>ENDING 0${r.id} · ${r.tag}</small><strong>${r.name}</strong><span>${r.floor} / ${r.boss}</span></button>`).join('');
 $('route-meta').textContent=`ENDING 0${active.id} / ${active.floor}`;
 $('route-title').textContent=active.name; $('boss').textContent=active.boss;
 $('overview').innerHTML=`<div><small>사전 해금</small><strong>${active.unlock}</strong></div><div><small>필수 소장품</small><strong>${active.items}</strong></div>`;
 $('steps').innerHTML=active.steps.map((s,i)=>`<li class="${checked(i)?'done':''}"><span class="step-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><label><span><span class="step-location">${s[0]}</span><span class="step-title">${s[1]}</span><span class="step-copy">${s[2]}</span></span><input type="checkbox" data-step="${i}" aria-label="${s[1]} 완료" ${checked(i)?'checked':''}></label></li>`).join('');
 $('warnings').innerHTML=active.warnings.map(w=>`<p class="warning">${w}</p>`).join('');
 $('branch').textContent=active.branch; $('extra-copy').textContent=active.extra; $('extra').open=false;
 $('sources').innerHTML=active.sources.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('');
 $('reset').textContent='이 엔딩 체크 초기화'; document.title=`${active.name} · Arknights INFO`;
 updateStorageNote(); progress();
}
$('themes').addEventListener('click',event=>{const b=event.target.closest('[data-theme]');if(!b)return;theme=themes.find(t=>t.id===b.dataset.theme);active=theme.routes[0];navigate();document.querySelector(`#themes [data-theme="${theme.id}"]`).focus();});
$('endings').addEventListener('click',event=>{const b=event.target.closest('[data-route]');if(!b)return;active=theme.routes.find(r=>r.id===b.dataset.route);navigate();document.querySelector(`[data-route="${active.id}"]`).focus();});
$('steps').addEventListener('change',event=>{const box=event.target;if(!box.matches('[data-step]'))return;let list=Array.isArray(state[routeKey()])?state[routeKey()].filter(i=>Number.isInteger(i)&&i>=0&&i<active.steps.length):[];const i=Number(box.dataset.step);state[routeKey()]=box.checked?[...new Set([...list,i])]:list.filter(n=>n!==i);box.closest('li').classList.toggle('done',box.checked);save();progress();});
$('reset').addEventListener('click',()=>{state[routeKey()]=[];save();render();$('reset').focus();});
window.addEventListener('hashchange',()=>{readHash();render();});
render();
// Optional browser API; ordinary browsers keep the same interface.
if (document.modelContext?.registerTool) {
 const lifecycle = new AbortController();
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const tool = {
  name:'read_ending_route',title:'엔딩 경로와 체크 기록 확인',
  description:'선택한 엔딩 또는 지정한 엔딩의 조건과 브라우저 체크 기록을 읽습니다. 게임 클리어 여부를 판정하지 않습니다.',
  inputSchema:{type:'object',properties:{themeId:{type:'string',enum:themes.map(t=>t.id)},endingId:{type:'string',enum:['1','2','3','4','5']}},additionalProperties:false},
  annotations:{readOnlyHint:true,untrustedContentHint:false},
  execute(input){
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['endingId','themeId'].includes(k)))throw new Error('Invalid input');
   const selectedTheme=input.themeId===undefined?theme:themes.find(t=>t.id===input.themeId);
   if(!selectedTheme)throw new Error('Unknown theme');
   const route=input.endingId===undefined?(selectedTheme===theme?active:selectedTheme.routes[0]):selectedTheme.routes.find(r=>r.id===input.endingId);
   if(!route)throw new Error('Unknown ending');
   return {themeId:selectedTheme.id,endingId:route.id,name:route.name,unlock:route.unlock,items:route.items,steps:route.steps.map((step,i)=>({location:step[0],action:step[1],detail:step[2],checked:Array.isArray(state[selectedTheme.id+':'+route.id])&&state[selectedTheme.id+':'+route.id].includes(i)})),warnings:route.warnings,branch:route.branch};
  }
 };
 try {Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
