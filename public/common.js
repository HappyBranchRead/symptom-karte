import {cases} from './content.js';
export const $=id=>document.getElementById(id);
export function storage(method,key,value){try{return localStorage[method](key,value);}catch{return null;}}
export async function api(path,options={}){
 let response;try{response=await fetch('/api/'+path,{cache:'no-store',signal:AbortSignal.timeout(15000),...options,headers:{'Content-Type':'application/json',...options.headers}});}catch{throw new Error('通信を確認して、もう一度お試しください。入力はこの端末に残っています');}
 let result;try{result=await response.json();}catch{throw new Error('接続できませんでした。時間をおいて再試行してください');}
 if(!response.ok){const error=new Error(result.error||'通信に失敗しました');error.status=response.status;throw error;}return result;
}
export const time=value=>value?new Date(value).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'';
export function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
export const summaryLabels={root:'一番の原因',remedy:'選んだ打ち手'};
export function note(post){const el=node('article',undefined,'note '+post.kind);el.dataset.postId=post.id;el.append(node('span',post.kind==='remedy'?'打ち手のアイデア':'原因・気づき','note-kind'),node('p',post.text,'answer'),node('small',time(post.createdAt)));return el;}
export function chart(data,{large=false}={}){
 const c=cases[data.group-1],el=node('article',undefined,'case-card chart'+(large?' chart-large':''));
 el.append(node('div','GROUP 0'+data.group,'eyebrow'),node('h2',c.name),node('p',c.symptom,'symptom-text'));
 const summary=node('div',undefined,'chart-summary');
 for(const [key,label] of Object.entries(summaryLabels)){const block=node('section');block.append(node('h3',label),node('p',data[key]||'議論をまとめているところです','answer'+(data[key]?'':' placeholder')));summary.append(block);}el.append(summary);
 el.append(node('div',data.posts.length+'件の気づき'+(data.updatedAt?' · '+time(data.updatedAt)+' 更新':''),'chart-meta'));
 if(large){el.append(node('h3','みんなの気づき'));const notes=node('div',undefined,'notes-grid');notes.append(...data.posts.map(note));if(!data.posts.length)notes.append(node('p','気づきはこれから集まります','placeholder'));el.append(notes);if(data.legacy.causes||data.legacy.links){const legacy=node('details',undefined,'context');legacy.append(node('summary','これまでの議論'),node('p',[data.legacy.causes,data.legacy.links].filter(Boolean).join('\n\n'),'answer'));el.append(legacy);}}
 return el;
}
const saved=storage('getItem','karte-theme');if(saved)document.documentElement.dataset.theme=saved;
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;const theme=dark?'light':'dark';document.documentElement.dataset.theme=theme;storage('setItem','karte-theme',theme);};
