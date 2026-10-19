import {cases,situation} from './content.js';
import {$,storage,api,node,summaryLabels} from './common.js';
const raw=new URLSearchParams(location.search).get('g'),group=/^[1-4]$/.test(raw||'')?Number(raw):0;
if(!group){
 $('picker').hidden=false;$('picker-situation').textContent=situation;
 for(const c of cases){const link=node('a',undefined,'case-card group-link');link.href='/?g='+c.group;link.append(node('span','GROUP 0'+c.group,'eyebrow'),node('h2',c.name),node('p',c.symptom),node('span','このグループに参加 →'));$('group-links').append(link);}
}else init();
function init(){
 storage('setItem','karte-last-group',String(group));$('workspace').hidden=false;
 $('group-label').textContent='GROUP 0'+group+' / OUR CHART';$('our-overview').href='/overview.html?group='+group;
 const c=cases[group-1];document.title=c.name+' · グループ'+group;
 $('case').append(node('span','現在の症状','eyebrow'),node('h1',c.name),node('p',c.symptom,'symptom-text'));
 let current=null,pending=null,saving=false;
 const editors={},save=$('save-karte'),status=$('save-status'),message=$('save-message');
 function readDraft(key){try{const value=JSON.parse(storage('getItem',key)||'null');if(value?.expiresAt>Date.now()&&typeof value.value==='string'&&Number.isSafeInteger(value.revision))return value;storage('removeItem',key);}catch{}return null;}
 const dirty=()=>Object.values(editors).some(e=>e.dirty);
 function keepDraft(field){const e=editors[field];storage('setItem',e.key,JSON.stringify({value:e.input.value,revision:e.revision,expiresAt:Date.now()+604800000}));}
 for(const [field,label] of Object.entries(summaryLabels)){
  const section=node('section',undefined,'summary-card'),heading=node('label',label,'field-label'),input=node('textarea');
  input.id='summary-'+field;heading.htmlFor=input.id;input.maxLength=2000;input.rows=7;input.placeholder=field==='root'?'なぜこの症状が起きている？ 原因や、そのつながりを書きましょう。':'チームとして何を変える？ 具体的な打ち手を書きましょう。';input.disabled=true;
  section.append(heading,input);$('summaries').append(section);
  const key='karte-summary-draft-'+group+'-'+field,backup=readDraft(key);
  editors[field]={input,key,dirty:Boolean(backup),revision:backup?.revision??0};if(backup)input.value=backup.value;
  input.oninput=()=>{editors[field].dirty=true;status.textContent='未保存 · この端末に下書きを保存';save.disabled=!current;keepDraft(field);};
 }
 function render(){
  if(saving)return;
  for(const [field,e] of Object.entries(editors)){
   if(!e.dirty){e.input.value=current[field];e.revision=current.revisions[field];}
   e.input.disabled=false;
  }
  save.disabled=!dirty();status.textContent=dirty()?'未保存 · この端末に下書きを保存':'保存済み';
 }
 function refresh(){
  if(pending)return pending;
  pending=(async()=>{try{current=await api('karte?group='+group);render();$('connection').textContent='● 共有中';}catch{$('connection').textContent='再接続を確認中';if(!saving){for(const e of Object.values(editors))e.input.disabled=false;if(!current)status.textContent='接続後に保存できます。入力は端末に控えます';}}finally{pending=null;}})();
  return pending;
 }
 $('karte-form').onsubmit=async event=>{
  event.preventDefault();if(!current||saving||!dirty())return;
  saving=true;save.disabled=true;Object.values(editors).forEach(e=>e.input.disabled=true);status.textContent='保存中…';message.textContent='';
  try{
   if(pending)await pending;
   const payload={root:editors.root.input.value,remedy:editors.remedy.input.value,revisions:{root:editors.root.revision,remedy:editors.remedy.revision}};
   const result=await api('karte?group='+group,{method:'PUT',body:JSON.stringify(payload)});
   for(const [field,e] of Object.entries(editors)){e.revision=result.revisions[field];e.dirty=false;storage('removeItem',e.key);current[field]=payload[field];current.revisions[field]=result.revisions[field];}
   status.textContent='カルテを保存しました';
  }catch(error){
   message.textContent=error.message;status.textContent='下書きはこの端末に残っています';
   if(error.status===409){
    await refresh();
    if(current){
     const latest=Object.entries(summaryLabels).map(([field,label])=>label+'：'+(current[field]||'（未入力）')).join('\n');
     message.textContent+='\n最新のカルテ\n'+latest+'\n下書きと見比べ、必要に応じて編集してから再度保存してください。';
     for(const [field,e] of Object.entries(editors)){if(!e.dirty)e.input.value=current[field];e.revision=current.revisions[field];if(e.dirty)keepDraft(field);}
    }
   }
  }finally{saving=false;Object.values(editors).forEach(e=>e.input.disabled=false);save.disabled=!dirty();}
 };
 refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('beforeunload',event=>{if(dirty()||saving){event.preventDefault();event.returnValue='';}});
}
