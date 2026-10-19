import {cases,situation} from './content.js';
import {$,storage,api,node,note,summaryLabels} from './common.js';
const raw=new URLSearchParams(location.search).get('g'),group=/^[1-4]$/.test(raw||'')?Number(raw):0;
if(!group){
 $('picker').hidden=false;$('picker-situation').textContent=situation;
 for(const c of cases){const link=node('a',undefined,'case-card group-link');link.href='/?g='+c.group;link.append(node('span','GROUP 0'+c.group,'eyebrow'),node('h2',c.name),node('p',c.question),node('span','このグループに参加 →'));$('group-links').append(link);}
}else init();
function init(){
 storage('setItem','karte-last-group',String(group));$('workspace').hidden=false;
 $('group-label').textContent='GROUP 0'+group+' / OUR CHART';$('our-overview').href='/overview.html?group='+group;
 const c=cases[group-1];document.title=c.name+' · グループ'+group;
 $('case').append(node('span','担当する症状','eyebrow'),node('h1',c.name),node('p',c.symptom,'symptom-text'),node('div',c.question,'question'));
 $('situation').textContent=situation;
 const key='karte-note-draft-'+group;let id=crypto.randomUUID(),sending=false,current=null,refreshing=false;
 function readDraft(k){try{const value=JSON.parse(storage('getItem',k)||'null');if(value?.expiresAt>Date.now())return value;storage('removeItem',k);}catch{}return null;}
 const draft=readDraft(key);if(draft){$('post-text').value=draft.text||'';if(draft.id)id=draft.id;const radio=document.querySelector('input[name=kind][value="'+(draft.kind==='remedy'?'remedy':'cause')+'"]');radio.checked=true;}
 function keepDraft(){storage('setItem',key,JSON.stringify({id,text:$('post-text').value,kind:document.querySelector('input[name=kind]:checked').value,expiresAt:Date.now()+604800000}));$('count').textContent=$('post-text').value.length+' / 500';}
 $('post-text').addEventListener('input',()=>{id=crypto.randomUUID();keepDraft();});document.querySelectorAll('input[name=kind]').forEach(r=>r.onchange=()=>{id=crypto.randomUUID();keepDraft();});keepDraft();
 const editors={};
 for(const [field,label] of Object.entries(summaryLabels)){
  const section=node('section',undefined,'summary-card'),head=node('div',undefined,'section-head'),heading=node('h3',label),edit=node('button','まとめを書く','text-button');head.append(heading,edit);
  const display=node('p','読み込み中…','answer placeholder'),form=node('form'),input=node('textarea'),message=node('p',undefined,'edit-message');input.maxLength=2000;input.rows=5;input.id='summary-'+field;const inputLabel=node('label',label+'の編集','sr-only');inputLabel.htmlFor=input.id;
  const actions=node('div',undefined,'edit-actions'),save=node('button','まとめを保存','primary'),cancel=node('button','閉じる');cancel.type='button';actions.append(save,cancel);form.append(inputLabel,input,message,actions);form.hidden=true;section.append(head,display,form);$('summaries').append(section);
  const state={editing:false,revision:0,dirty:false,saving:false};editors[field]={state,display,input,edit};
  const summaryKey='karte-summary-draft-'+group+'-'+field;
  input.oninput=()=>{state.dirty=true;storage('setItem',summaryKey,JSON.stringify({value:input.value,revision:state.revision,expiresAt:Date.now()+604800000}));};
  edit.onclick=()=>{if(!current)return;const backup=readDraft(summaryKey);state.revision=backup?.revision??current.revisions[field];input.value=backup?.value??current[field];state.editing=true;state.dirty=Boolean(backup);form.hidden=false;edit.hidden=true;message.textContent=backup?'この端末の書きかけを復元しました':'';input.focus();};
  cancel.onclick=()=>{state.editing=false;state.dirty=false;form.hidden=true;edit.hidden=false;};
  form.onsubmit=async event=>{
   event.preventDefault();if(state.saving)return;state.saving=true;save.disabled=true;input.disabled=true;cancel.disabled=true;
   try{await api('karte?group='+group,{method:'PUT',body:JSON.stringify({field,value:input.value,revision:state.revision})});storage('removeItem',summaryKey);state.dirty=false;state.editing=false;form.hidden=true;edit.hidden=false;await refresh();}
   catch(error){message.textContent=error.message;if(error.status===409){await refresh();if(current){message.textContent+='\n最新のまとめ：'+(current[field]||'（未入力）')+'\n編集欄の内容は残しています。必要に応じて書き直し、再度保存してください。';state.revision=current.revisions[field];input.oninput();}}}
   finally{state.saving=false;save.disabled=false;input.disabled=false;cancel.disabled=false;}
  };
 }
 function render(){
  const oldPosts=$('posts').querySelectorAll('[data-post-id]');const existing=new Set([...oldPosts].map(el=>el.dataset.postId));
  if(!current.posts.length){$('posts').replaceChildren(node('div','まだ投稿はありません。最初の気づきを共有してみましょう。','empty-state'));}
  else{if(!oldPosts.length)$('posts').replaceChildren();for(const post of current.posts)if(!existing.has(post.id))$('posts').append(note(post));}
  $('post-count').textContent=current.posts.length+'件の気づき';
  for(const [field,{display,edit}] of Object.entries(editors)){display.textContent=current[field]||'みんなの議論から、考えをまとめましょう';display.classList.toggle('placeholder',!current[field]);edit.textContent=current[field]?'編集する':'まとめを書く';}
  $('legacy').hidden=!current.legacy.causes&&!current.legacy.links;$('legacy-text').textContent=[current.legacy.causes,current.legacy.links].filter(Boolean).join('\n\n');
 }
 async function refresh(){if(refreshing)return;refreshing=true;try{current=await api('karte?group='+group);render();$('connection').textContent='● 共有中';}catch{$('connection').textContent='再接続を確認中';}finally{refreshing=false;}}
 $('composer').onsubmit=async event=>{
  event.preventDefault();if(sending||!$('post-text').value.trim())return;sending=true;
  const elements=[...$('composer').elements];elements.forEach(el=>el.disabled=true);$('post-status').textContent='共有中…';
  try{await api('posts?group='+group,{method:'POST',body:JSON.stringify({id,text:$('post-text').value,kind:document.querySelector('input[name=kind]:checked').value})});$('post-text').value='';storage('removeItem',key);id=crypto.randomUUID();$('count').textContent='0 / 500';$('post-status').textContent='共有しました';await refresh();}
  catch(error){$('post-status').textContent=error.message;}
  finally{sending=false;elements.forEach(el=>el.disabled=false);if(!$('post-text').value)$('post-text').focus();}
 };
 refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 window.addEventListener('beforeunload',event=>{if(sending||Object.values(editors).some(e=>e.state.editing&&e.state.dirty)){event.preventDefault();event.returnValue='';}});
}
