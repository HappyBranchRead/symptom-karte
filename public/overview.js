import {cases} from './content.js';
import {$,storage,api,node,chart,summaryLabels} from './common.js';
const raw=new URLSearchParams(location.search).get('group')||storage('getItem','karte-last-group');const group=/^[1-4]$/.test(raw||'')?Number(raw):0;
if(group){$('back').href='/?g='+group;$('back').textContent='自分のカルテに戻る';}
let data=null,index=0,refreshing=false,signature='';
function showDetail(){if(!data)return;const selectedGroup=data.groups[index].group;$('join-group').href='/?g='+selectedGroup;$('join-group').textContent='グループ'+selectedGroup+'に参加して書き込む →';const position=$('detail').scrollTop;$('detail-content').replaceChildren(chart(data.groups[index],{large:true}));$('page-number').textContent=(index+1)+' / 4';$('previous').disabled=index===0;$('next').disabled=index===3;$('detail').scrollTop=position;}
$('close').onclick=()=>$('detail').close();$('previous').onclick=()=>{index=Math.max(0,index-1);showDetail();$('detail').scrollTop=0;};$('next').onclick=()=>{index=Math.min(3,index+1);showDetail();$('detail').scrollTop=0;};
function render(){
 const focus=document.activeElement?.dataset.openGroup;
 $('cards').replaceChildren(...data.groups.map(g=>{
  const wrapper=node('div',undefined,'overview-item'),card=chart(g),open=node('button','カルテを大きく見る ↗','open-chart');open.dataset.openGroup=g.group;open.setAttribute('aria-label','グループ'+g.group+' '+cases[g.group-1].name+'のカルテを大きく見る');open.onclick=()=>{index=g.group-1;showDetail();$('detail').showModal();};card.append(open);wrapper.append(card);return wrapper;
 }));
 if(focus&&!$('detail').open)document.querySelector('[data-open-group="'+focus+'"]')?.focus();
 if($('detail').open)showDetail();
}
async function refresh(){if(refreshing)return;refreshing=true;try{const result=await api('all');data=result;const nextSignature=JSON.stringify(result);if(nextSignature!==signature){signature=nextSignature;render();}$('status').textContent='● 共有中 · '+new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});}catch(error){$('status').textContent=data?'接続を確認中 · 最後に取得した内容を表示':error.message;}finally{refreshing=false;}}
$('export').onclick=()=>{
 if(!data){$('status').textContent='読み込み後に記録を保存できます';return;}
 const text='# AI駆動開発 症状カルテ\n\n'+new Date().toLocaleString('ja-JP')+'\n\n'+data.groups.map(g=>{
  const sections=Object.entries(summaryLabels).map(([field,label])=>'### '+label+'\n\n'+(g[field]||'（未入力）'));
  sections.push('### みんなの気づき\n\n'+g.posts.map(p=>'- ['+(p.kind==='remedy'?'打ち手':'原因・気づき')+'] '+p.text.replaceAll('\n','\n  ')).join('\n'));
  if(g.legacy.causes||g.legacy.links)sections.push('### これまでの議論\n\n'+[g.legacy.causes,g.legacy.links].filter(Boolean).join('\n\n'));
  return '## グループ'+g.group+'：'+cases[g.group-1].name+'\n\n'+sections.join('\n\n');
 }).join('\n\n---\n\n');
 const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const a=node('a');a.href=url;a.download='症状カルテ-'+new Date().toISOString().slice(0,10)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
refresh();setInterval(()=>{if(!document.hidden)refresh();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
