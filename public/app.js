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
 let current=null,pending=null;
 const editors={};
 function readDraft(key){try{const value=JSON.parse(storage('getItem',key)||'null');if(value?.expiresAt>Date.now()&&typeof value.value==='string'&&Number.isSafeInteger(value.revision))return value;storage('removeItem',key);}catch{}return null;}
 for(const [field,label] of Object.entries(summaryLabels)){
  const form=node('form',undefined,'summary-card'),heading=node('label',label,'field-label'),input=node('textarea'),message=node('p',undefined,'edit-message'),status=node('span','読み込み中…','field-status'),save=node('button','保存して共有','primary');
  input.id='summary-'+field;heading.htmlFor=input.id;status.setAttribute('role','status');message.setAttribute('role','alert');input.maxLength=2000;input.rows=7;input.placeholder=field==='root'?'なぜこの症状が起きている？ 原因や、そのつながりを書きましょう。':'チームとして何を変える？ 具体的な打ち手を書きましょう。';input.disabled=true;save.disabled=true;
  const actions=node('div',undefined,'field-actions');actions.append(status,save);form.append(heading,input,message,actions);$('summaries').append(form);
  const key='karte-summary-draft-'+group+'-'+field,backup=readDraft(key),state={dirty:Boolean(backup),revision:backup?.revision??0,saving:false};if(backup)input.value=backup.value;
  editors[field]={state,input,message,status,save};
  function keepDraft(){storage('setItem',key,JSON.stringify({value:input.value,revision:state.revision,expiresAt:Date.now()+604800000}));}
  input.oninput=()=>{state.dirty=true;status.textContent='未保存 · この端末に下書きを保存';save.disabled=!current;keepDraft();};
  form.onsubmit=async event=>{
   event.preventDefault();if(!current||state.saving||!state.dirty)return;state.saving=true;input.disabled=true;save.disabled=true;status.textContent='保存中…';message.textContent='';
   try{
    const result=await api('karte?group='+group,{method:'PUT',body:JSON.stringify({field,value:input.value,revision:state.revision})});
    state.revision=result.revision;state.dirty=false;storage('removeItem',key);current[field]=input.value;current.revisions[field]=result.revision;status.textContent='保存済み';
    await refresh();
   }catch(error){
    message.textContent=error.message;status.textContent='下書きはこの端末に残っています';
    if(error.status===409){
     await refresh();
     if(current){message.textContent+='\n最新の'+label+'：'+(current[field]||'（未入力）')+'\n入力欄の下書きと見比べ、必要に応じて編集してから再度保存してください。';state.revision=current.revisions[field];keepDraft();}
    }
   }finally{state.saving=false;input.disabled=false;save.disabled=!state.dirty;}
  };
 }
 function render(){
  for(const [field,{state,input,status,save}] of Object.entries(editors)){
   if(!state.dirty&&!state.saving){input.value=current[field];state.revision=current.revisions[field];status.textContent=current[field]?'保存済み':'ここに直接書き込めます';}
   else if(!state.saving&&status.textContent==='読み込み中…')status.textContent='この端末の下書きを復元しました';
   if(!state.saving){input.disabled=false;save.disabled=!state.dirty;}
  }
 }
 function refresh(){
  if(pending)return pending;
  pending=(async()=>{try{current=await api('karte?group='+group);render();$('connection').textContent='● 共有中';}catch{$('connection').textContent='再接続を確認中';for(const {input,status} of Object.values(editors)){input.disabled=false;if(!current)status.textContent='接続後に保存できます。入力は端末に控えます';}}finally{pending=null;}})();
  return pending;
 }
 refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('beforeunload',event=>{if(Object.values(editors).some(e=>e.state.dirty||e.state.saving)){event.preventDefault();event.returnValue='';}});
}
