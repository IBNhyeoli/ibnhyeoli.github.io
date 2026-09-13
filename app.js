'use strict';
const $ = id => document.getElementById(id);
const key = 'sui-route-guide-v1';
let state = {};
let storageAvailable = true;
try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) state = saved; } catch { storageAvailable = false; }
let active = routes.find(r => '#ending-'+r.id === location.hash) || routes[1];
function save() { try {localStorage.setItem(key, JSON.stringify(state));} catch {storageAvailable=false;} updateStorageNote(); }
function updateStorageNote() {$('storage-note').textContent = storageAvailable ? '체크 기록은 이 브라우저에 저장됩니다.' : '브라우저 저장을 사용할 수 없어 현재 화면에서만 체크가 유지됩니다.';}
function checked(index) {return Array.isArray(state[active.id]) && state[active.id].includes(index);}
function progress() { const count = active.steps.filter((_,i)=>checked(i)).length; $('progress').max=active.steps.length; $('progress').value=count; $('progress-label').textContent = count === active.steps.length ? '모든 항목 체크 완료 · 실제 클리어 여부는 게임에서 확인하세요.' : `${count} / ${active.steps.length} 완료`; }
function render(){
 $('endings').innerHTML = routes.map(r=>`<button type="button" data-route="${r.id}" aria-pressed="${r.id===active.id}"><small>ENDING 0${r.id} · ${r.tag}</small><strong>${r.name}</strong><span>${r.floor} / ${r.boss}</span></button>`).join('');
 $('route-meta').textContent=`ENDING 0${active.id} / ${active.floor}`;
 $('route-title').textContent=active.name; $('boss').textContent=active.boss;
 $('overview').innerHTML=`<div><small>사전 해금</small><strong>${active.unlock}</strong></div><div><small>필수 소장품</small><strong>${active.items}</strong></div>`;
 $('steps').innerHTML=active.steps.map((s,i)=>`<li class="${checked(i)?'done':''}"><span class="step-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><label><span><span class="step-location">${s[0]}</span><span class="step-title">${s[1]}</span><span class="step-copy">${s[2]}</span></span><input type="checkbox" data-step="${i}" aria-label="${s[1]} 완료" ${checked(i)?'checked':''}></label></li>`).join('');
 $('warnings').innerHTML=active.warnings.map(w=>`<p class="warning">${w}</p>`).join('');
 $('branch').textContent=active.branch; $('extra-copy').textContent=active.extra; $('extra').open=false;
 $('sources').innerHTML=active.sources.map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('');
 $('reset').textContent='이 엔딩 체크 초기화'; document.title=`${active.name} · 계원 길잡이`;
 updateStorageNote(); progress();
}
$('endings').addEventListener('click',event=>{const b=event.target.closest('[data-route]');if(!b)return;const id=b.dataset.route;active=routes.find(r=>r.id===id);try{history.replaceState(null,'','#ending-'+id);}catch{}render();document.querySelector(`[data-route="${id}"]`).focus();});
$('steps').addEventListener('change',event=>{const box=event.target;if(!box.matches('[data-step]'))return;let list=Array.isArray(state[active.id])?state[active.id].filter(i=>Number.isInteger(i)&&i>=0&&i<active.steps.length):[];const i=Number(box.dataset.step);state[active.id]=box.checked?[...new Set([...list,i])]:list.filter(n=>n!==i);box.closest('li').classList.toggle('done',box.checked);save();progress();});
$('reset').addEventListener('click',()=>{state[active.id]=[];save();render();$('reset').focus();});
window.addEventListener('hashchange',()=>{const route=routes.find(r=>'#ending-'+r.id===location.hash);if(route){active=route;render();}});
render();
// Optional browser API; ordinary browsers keep the same interface.
if (document.modelContext?.registerTool) {
 const lifecycle = new AbortController();
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
 const tool = {
  name:'read_ending_route',title:'엔딩 경로와 체크 기록 확인',
  description:'선택한 엔딩 또는 지정한 엔딩의 조건과 브라우저 체크 기록을 읽습니다. 게임 클리어 여부를 판정하지 않습니다.',
  inputSchema:{type:'object',properties:{endingId:{type:'string',enum:['1','2','3','4','5']}},additionalProperties:false},
  annotations:{readOnlyHint:true,untrustedContentHint:false},
  execute(input){
   if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='endingId'))throw new Error('Invalid input');
   const route=input.endingId===undefined?active:routes.find(r=>r.id===input.endingId);
   if(!route)throw new Error('Unknown ending');
   return {endingId:route.id,name:route.name,unlock:route.unlock,items:route.items,steps:route.steps.map((step,i)=>({location:step[0],action:step[1],detail:step[2],checked:Array.isArray(state[route.id])&&state[route.id].includes(i)})),warnings:route.warnings,branch:route.branch};
  }
 };
 try {Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}
}
