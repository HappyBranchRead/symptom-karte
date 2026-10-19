import {cases,situation} from './content.js';
import {$,labels,storage,api,time,node,card} from './common.js';
$('situation').textContent=situation;
const raw=new URLSearchParams(location.search).get('g');
const group=/^[1-4]$/.test(raw||'')?Number(raw):0;
if(!group){$('picker').hidden=false;for(const c of cases){const a=node('a',undefined,'case-card group-link');a.href='/?g='+c.group;a.append(node('span','GROUP 0'+c.group,'eyebrow'),node('h2',c.name),node('span','カルテを開く →'));$('group-links').append(a);}}
else{init();}
async function init(){
 $('workspace').hidden=false;$('group-label').textContent='GROUP 0'+group+' / YOUR CASE';
 const c=cases[group-1];$('case').append(node('span','担当症状','eyebrow'),node('h2',c.name),node('p',c.symptom),node('h3','考えてほしい問い'),node('p',c.question,'question'));
 const localKey='karte-draft-'+group;
 let data={causes:'',links:'',root:'',remedy:''},version=0,savedVersion=0,saving=false,ready=false,debounce,retry;
 const inputs={};
 for(const [key,label] of Object.entries(labels)){const wrap=node('div',undefined,'input-card');const l=node('label',undefined);l.htmlFor=key;l.append(node('span','0'+(Object.keys(inputs).length+1),'eyebrow'),node('strong',label));const input=node('textarea');input.id=key;input.maxLength=2000;input.rows=6;input.placeholder={causes:'気づいたことを、まずは自由に書き出す',links:'原因はどのようにつながっている？',root:'チームとして取り組むべき、一番の原因は？',remedy:'誰が・いつ・何をするか、具体的に'}[key];input.disabled=true;const count=node('small','0 / 2,000','count');wrap.append(l,input,count);$('fields').append(wrap);inputs[key]=input;
 input.addEventListener('input',()=>{data[key]=input.value;count.textContent=input.value.length+' / 2,000';version++;storage('localStorage','setItem',localKey,JSON.stringify({data,dirty:true,expiresAt:Date.now()+604800000}));$('save-status').textContent='保存待ち…';clearTimeout(debounce);clearTimeout(retry);debounce=setTimeout(save,2000);renderPresentation();});}
 function fill(){for(const key of Object.keys(labels)){inputs[key].value=data[key];inputs[key].nextElementSibling.textContent=data[key].length+' / 2,000';inputs[key].disabled=false;}renderPresentation();}
 function draft(){try{const v=JSON.parse(storage('localStorage','getItem',localKey)||'null');if(v?.expiresAt<Date.now()){storage('localStorage','removeItem',localKey);return null;}return v&&v.data&&Object.keys(labels).every(k=>typeof v.data[k]==='string'&&v.data[k].length<=2000)?v:null;}catch{return null;}}
 async function save(){if(!ready||saving||version===savedVersion)return;clearTimeout(retry);saving=true;const currentVersion=version,snapshot={...data};$('save-status').textContent='保存中…';try{const result=await api('karte?group='+group,{method:'PUT',body:JSON.stringify(snapshot)});savedVersion=currentVersion;if(version===currentVersion){storage('localStorage','setItem',localKey,JSON.stringify({data,dirty:false,expiresAt:Date.now()+604800000}));$('save-status').textContent='保存済み（'+time(result.updatedAt)+'）';}}catch{$('save-status').textContent='保存に失敗しました。通信を確認してください';retry=setTimeout(save,10000);}finally{saving=false;if(version!==currentVersion){clearTimeout(debounce);debounce=setTimeout(save,2000);}}}
 const local=draft();try{const server=await api('karte?group='+group);const serverEmpty=!Object.keys(labels).some(k=>server[k]);if(local&&(local.dirty||serverEmpty)){data=local.data;version++;$('save-status').textContent='端末内の控えを復元しました';}else{data=Object.fromEntries(Object.keys(labels).map(k=>[k,server[k]]));$('save-status').textContent=server.updatedAt?'保存済み（'+time(server.updatedAt)+'）':'入力すると自動保存されます';}}catch{if(local){data=local.data;if(local.dirty)version++;}$('save-status').textContent='読み込みに失敗しました。入力は端末に控えます。通信を確認してください';}
 ready=true;fill();if(version)debounce=setTimeout(save,2000);
 $('fields').onsubmit=e=>e.preventDefault();
 function renderPresentation(){if(!$('presentation').hidden)$('presentation').replaceChildren(card({group,...data},{compact:true}));}
 $('present').onclick=()=>{$('presentation').hidden=!$('presentation').hidden;$('present').textContent=$('presentation').hidden?'発表用カルテを表示 ↗':'発表用カルテを閉じる';renderPresentation();if(!$('presentation').hidden)$('presentation').scrollIntoView({behavior:'instant'});};
 let polling=false;async function poll(){if(polling)return;polling=true;try{const {phase}=await api('phase');$('phase').textContent=phase==='open'?'全体公開':'ワーク中';$('shared').hidden=phase!=='open';if(phase==='open'){const all=await api('all');$('shared-cards').replaceChildren(...all.groups.map(g=>card(g)));}else $('shared-cards').replaceChildren();}catch(error){$('phase').textContent='接続確認中';$('shared').hidden=true;$('shared-cards').replaceChildren();}finally{polling=false;}}
 poll();setInterval(poll,5000);
 let remaining=120,end=0,ticking=false;
 function draw(){const min=Math.floor(remaining/60),sec=remaining%60;$('clock').textContent=String(min).padStart(2,'0')+':'+String(sec).padStart(2,'0');$('start').textContent=ticking?'一時停止':remaining?'開始':'終了';}
 function resetTimer(){ticking=false;remaining=Number($('step').value);draw();}
 $('step').onchange=resetTimer;$('reset-timer').onclick=resetTimer;$('start').onclick=()=>{if(!remaining)return;if(ticking){remaining=Math.max(0,Math.ceil((end-Date.now())/1000));ticking=false;}else{end=Date.now()+remaining*1000;ticking=true;}draw();};
 setInterval(()=>{if(ticking){remaining=Math.max(0,Math.ceil((end-Date.now())/1000));if(!remaining){ticking=false;$('save-status').textContent='タイマーが終了しました';}draw();}},250);
 window.addEventListener('beforeunload',event=>{if(version!==savedVersion){event.preventDefault();event.returnValue='';}});
}
