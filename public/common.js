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
export const summaryLabels={root:'原因分析',remedy:'処方'};
export function chart(data,{large=false}={}){
 const c=cases[data.group-1],el=node('article',undefined,'case-card chart'+(large?' chart-large':''));
 el.append(node('div','GROUP 0'+data.group,'eyebrow'),node('h2',c.name),node('h3','現在の症状'),node('p',c.symptom,'symptom-text'));
 const summary=node('div',undefined,'chart-summary');
 for(const [key,label] of Object.entries(summaryLabels)){const block=node('section');block.append(node('h3',label),node('p',data[key]||'まだ記入されていません','answer'+(data[key]?'':' placeholder')));summary.append(block);}el.append(summary);
 return el;
}
const saved=storage('getItem','karte-theme');if(saved)document.documentElement.dataset.theme=saved;
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;const theme=dark?'light':'dark';document.documentElement.dataset.theme=theme;storage('setItem','karte-theme',theme);};
