import {cases,conclusion} from './content.js';
import {$,labels,storage,api,node,card} from './common.js';
let pass=storage('sessionStorage','getItem','karte-admin')||'',data=null,presenting=false,index=0,busy=false,refreshing=false;
const request=(path,options={})=>api(path,{...options,headers:{'x-admin-pass':pass}});
function locked(){pass='';storage('sessionStorage','removeItem','karte-admin');$('dashboard').hidden=true;$('login').hidden=false;$('cards').replaceChildren();data=null;}
function error(e){$('status').textContent=e.message;if(e.status===401)locked();}
function render(){if(!data)return;$('phase').textContent=data.phase==='open'?'全体公開':'ワーク中';$('toggle-phase').textContent=data.phase==='open'?'ワーク中に戻す':'全体公開にする';$('navigation').hidden=!presenting;$('cards').classList.toggle('slides',presenting);$('present').textContent=presenting?'一覧に戻す':'発表モード';$('slide-number').textContent=(index+1)+' / 4';$('previous').disabled=index===0;$('next').disabled=index===3;const groups=presenting?[data.groups[index]]:data.groups;$('cards').replaceChildren(...groups.map(g=>card(g,{hints:$('hints').checked})));$('conclusion').hidden=!$('hints').checked;$('conclusion').textContent=conclusion;}
async function refresh(){if(refreshing||busy||!pass)return;refreshing=true;try{data=await request('all');$('login').hidden=true;$('dashboard').hidden=false;$('status').textContent='最終取得 '+new Date().toLocaleTimeString('ja-JP');render();}catch(e){error(e);}finally{refreshing=false;}}
$('login').onsubmit=async event=>{event.preventDefault();const button=$('login').querySelector('button');button.disabled=true;try{const value=$('pass').value;await api('login',{method:'POST',body:JSON.stringify({pass:value})});pass=value;storage('sessionStorage','setItem','karte-admin',pass);$('pass').value='';await refresh();}catch(e){error(e);}finally{button.disabled=false;}};
$('logout').onclick=locked;
$('hints').onchange=render;$('present').onclick=()=>{presenting=!presenting;render();};$('previous').onclick=()=>{index=Math.max(0,index-1);render();};$('next').onclick=()=>{index=Math.min(3,index+1);render();};
async function mutate(path,body){if(busy)return;busy=true;$('toggle-phase').disabled=true;$('reset').disabled=true;try{await request(path,{method:'POST',body:JSON.stringify(body)});}catch(e){error(e);}finally{busy=false;$('toggle-phase').disabled=false;$('reset').disabled=false;await refresh();}}
$('toggle-phase').onclick=()=>{if(data)mutate('phase',{phase:data.phase==='open'?'work':'open'});};
$('reset').onclick=()=>{if(confirm('全4グループの入力を削除し、ワーク中に戻します。書き出しは完了していますか？ この操作は元に戻せません。'))mutate('reset',{});};
function markdown(){return '# AI駆動開発 症状カルテ\n\n書き出し: '+new Date().toLocaleString('ja-JP')+'\n\n'+data.groups.map(g=>'## グループ'+g.group+'：'+cases[g.group-1].name+'\n\n'+Object.entries(labels).map(([k,label])=>'### '+label+'\n\n'+(g[k]||'（未入力）')).join('\n\n')).join('\n\n---\n\n')+'\n';}
$('export').onclick=async()=>{try{await refresh();if(!data)return;await navigator.clipboard.writeText(markdown());$('status').textContent='Markdownをコピーしました';}catch{$('status').textContent='コピーできませんでした。ダウンロードボタンで保存してください';}};
$('download').onclick=()=>{if(!data)return;const url=URL.createObjectURL(new Blob([markdown()],{type:'text/markdown;charset=utf-8'}));const a=node('a');a.href=url;a.download='症状カルテ-'+new Date().toISOString().slice(0,10)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const c of cases){const p=node('p'),a=node('a','グループ'+c.group+' · '+location.origin+'/?g='+c.group);a.href='/?g='+c.group;p.append(a);$('links').append(p);}
if(pass)refresh();setInterval(refresh,5000);
