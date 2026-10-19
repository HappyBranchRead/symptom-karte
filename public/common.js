import {cases} from './content.js';
export const $=id=>document.getElementById(id);
export const labels={causes:'出てきた原因',links:'原因同士のつながり',root:'一番の原因',remedy:'選んだ打ち手'};
export function storage(type,method,key,value){try{return window[type][method](key,value);}catch{return null;}}
export async function api(path,options={}){const response=await fetch('/api/'+path,{cache:'no-store',signal:AbortSignal.timeout(15000),...options,headers:{'Content-Type':'application/json',...options.headers}});let result;try{result=await response.json();}catch{throw new Error('通信に失敗しました。接続を確認してください');}if(!response.ok){const e=new Error(result.error);e.status=response.status;throw e;}return result;}
export const time=value=>value?new Date(value).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}):'未入力';
export function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
export function card(data,{compact=false,hints=false}={}){const c=cases[Number(data.group)-1],el=node('article',undefined,'case-card');el.append(node('div','GROUP 0'+data.group,'eyebrow'),node('h2',c.name));for(const key of compact?['root','remedy']:Object.keys(labels)){el.append(node('h3',labels[key]),node('p',data[key]||'まだ入力されていません','answer'));}el.append(node('small','最終更新 '+time(data.updatedAt)));if(hints){const aside=node('aside',undefined,'hint');aside.append(node('h3','考えられる原因'),node('p',c.hintCause),node('h3','打ち手の例'),node('p',c.hintRemedy));el.append(aside);}return el;}
const saved=storage('localStorage','getItem','karte-theme');if(saved)document.documentElement.dataset.theme=saved;
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;const theme=dark?'light':'dark';document.documentElement.dataset.theme=theme;storage('localStorage','setItem','karte-theme',theme);};
