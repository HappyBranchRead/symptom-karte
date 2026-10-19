import {cases} from './content.js';
import {$,storage,api,node,chart} from './common.js';
const raw=new URLSearchParams(location.search).get('group')||storage('getItem','karte-last-group');const group=/^[1-4]$/.test(raw||'')?Number(raw):0;
if(group){$('back').href='/?g='+group;$('back').textContent='自分のカルテに戻る';}
let data=null,refreshing=false,signature='';
function render(){
 const focus=document.activeElement?.dataset.openGroup;
 $('cards').replaceChildren(...data.groups.map(g=>{
  const link=node('a',undefined,'overview-item');link.href='/?g='+g.group;link.dataset.openGroup=g.group;link.setAttribute('aria-label','グループ'+g.group+' '+cases[g.group-1].name+'のカルテを編集する');link.append(chart(g));return link;
 }));
 if(focus)document.querySelector('[data-open-group="'+focus+'"]')?.focus();
}
async function refresh(){if(refreshing)return;refreshing=true;try{const result=await api('all');data=result;const nextSignature=JSON.stringify(result);if(nextSignature!==signature){signature=nextSignature;render();}$('status').textContent='● 共有中 · '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});}catch(error){$('status').textContent=data?'接続を確認中 · 最後に取得した内容を表示':error.message;}finally{refreshing=false;}}
refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
