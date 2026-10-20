import {redisClient} from './redis.js';
export {redisConfig} from './redis.js';
export const TTL=604800;
const parse=value=>{if(typeof value!=='string')return value;try{return JSON.parse(value);}catch{return null;}};
export function board(group,hash={},legacy={}){
 if(Array.isArray(hash)){
  const values=hash;hash={};
  for(let i=0;i<values.length;i+=2)hash[values[i]]=values[i+1];
 }
 hash=hash||{};legacy=parse(legacy)||{};
 const posts=Object.entries(hash).filter(([key])=>key.startsWith('note:')).map(([,value])=>parse(value)).filter(p=>p&&typeof p.text==='string').sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
 return {group,issue:hash.issue??'',root:hash.root??legacy.root??'',remedy:hash.remedy??legacy.remedy??'',revisions:{issue:Number(hash.issueRev||0),root:Number(hash.rootRev||0),remedy:Number(hash.remedyRev||0)},posts,legacy:{causes:legacy.causes||'',links:legacy.links||''},updatedAt:hash.updatedAt||legacy.updatedAt||null};
}
// Compare-and-set protects each shared summary field from stale edits.
export const SUMMARY_SCRIPT=`
local field = ARGV[1]
local revision = tonumber(redis.call('HGET', KEYS[1], field .. 'Rev') or '0')
if revision ~= tonumber(ARGV[3]) then return {-1, revision} end
local nextRevision = revision + 1
redis.call('HSET', KEYS[1], field, ARGV[2], field .. 'Rev', nextRevision, 'updatedAt', ARGV[4])
redis.call('EXPIRE', KEYS[1], ARGV[5])
return {1, nextRevision}
`;
// Both fields are checked and written together: a conflict never causes a partial save.
export const KARTE_SCRIPT=`
local rootRev = tonumber(redis.call('HGET', KEYS[1], 'rootRev') or '0')
local remedyRev = tonumber(redis.call('HGET', KEYS[1], 'remedyRev') or '0')
if rootRev ~= tonumber(ARGV[3]) or remedyRev ~= tonumber(ARGV[4]) then return {-1, rootRev, remedyRev} end
redis.call('HSET', KEYS[1], 'root', ARGV[1], 'remedy', ARGV[2], 'rootRev', rootRev + 1, 'remedyRev', remedyRev + 1, 'updatedAt', ARGV[5])
redis.call('EXPIRE', KEYS[1], ARGV[6])
return {1, rootRev + 1, remedyRev + 1}
`;
// New workshop cards save the chosen issue, hypothesis and experiment together.
export const WORKSHOP_SCRIPT=`
local issueRev = tonumber(redis.call('HGET', KEYS[1], 'issueRev') or '0')
local rootRev = tonumber(redis.call('HGET', KEYS[1], 'rootRev') or '0')
local remedyRev = tonumber(redis.call('HGET', KEYS[1], 'remedyRev') or '0')
if issueRev ~= tonumber(ARGV[4]) or rootRev ~= tonumber(ARGV[5]) or remedyRev ~= tonumber(ARGV[6]) then return {-1, issueRev, rootRev, remedyRev} end
redis.call('HSET', KEYS[1], 'issue', ARGV[1], 'root', ARGV[2], 'remedy', ARGV[3], 'issueRev', issueRev + 1, 'rootRev', rootRev + 1, 'remedyRev', remedyRev + 1, 'updatedAt', ARGV[7])
redis.call('EXPIRE', KEYS[1], ARGV[8])
return {1, issueRev + 1, rootRev + 1, remedyRev + 1}
`;
export function createHandler(route,getRedis=redisClient){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const fail=(status,error)=>res.status(status).json({error});
  const allowed={karte:['GET','PUT'],posts:['POST'],all:['GET']}[route];
  if(!allowed||!allowed.includes(req.method)){res.setHeader('Allow',(allowed||[]).join(', '));return fail(405,'許可されていないメソッドです');}
  try{
   let group;
   if(route!=='all'){
    if(!/^[1-4]$/.test(String(req.query.group??''))||Array.isArray(req.query.group))return fail(400,'グループは1〜4で指定してください');
    group=Number(req.query.group);
   }
   let body=req.body;
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{return fail(400,'JSON形式が不正です');}}
   if(route==='posts'){
    if(!body||typeof body.text!=='string'||!body.text.trim()||body.text.length>500||!['cause','remedy'].includes(body.kind)||typeof body.id!=='string'||! /^[a-f0-9-]{36}$/i.test(body.id))return fail(400,'原因・打ち手を選び、500文字以内で入力してください');
   }
   if(route==='karte'&&req.method==='PUT'){
    const validText=value=>typeof value==='string'&&value.length<=2000;
    const validRevision=value=>Number.isSafeInteger(value)&&value>=0;
    const valid=body&&(Object.hasOwn(body,'field')
     ? ['issue','root','remedy'].includes(body.field)&&validText(body.value)&&validRevision(body.revision)
     : validText(body.root)&&validText(body.remedy)&&validRevision(body.revisions?.root)&&validRevision(body.revisions?.remedy)&&(!Object.hasOwn(body,'issue')||(validText(body.issue)&&validRevision(body.revisions?.issue))));
    if(!valid)return fail(400,'着目した問題・原因の仮説・試す処方はそれぞれ2,000文字以内で入力し、最新の版番号を指定してください');
   }
   const db=await getRedis();
   if(route==='all'){
    const [legacy,...hashes]=await Promise.all([db.mget('karte:1','karte:2','karte:3','karte:4'),...[1,2,3,4].map(g=>db.hgetall(`board:${g}`))]);
    return res.status(200).json({groups:hashes.map((hash,i)=>board(i+1,hash,legacy[i]))});
   }
   const key=`board:${group}`;
   if(route==='karte'&&req.method==='GET'){
    const [hash,legacy]=await Promise.all([db.hgetall(key),db.get(`karte:${group}`)]);
    return res.status(200).json(board(group,hash,legacy));
   }
   const updatedAt=new Date().toISOString();
   if(route==='posts'){
    const post={id:body.id,text:body.text.trim(),kind:body.kind,createdAt:updatedAt};
    const tx=db.multi();
    tx.hset(key,{['note:'+post.id]:JSON.stringify(post),updatedAt});tx.expire(key,TTL);await tx.exec();
    return res.status(200).json({post});
   }
   const combined=!Object.hasOwn(body,'field');
   if(combined&&Object.hasOwn(body,'issue')){
    const result=await db.eval(WORKSHOP_SCRIPT,[key],[body.issue,body.root,body.remedy,body.revisions.issue,body.revisions.root,body.revisions.remedy,updatedAt,TTL]);
    if(Number(result[0])===-1)return fail(409,'ほかの人がカルテを更新しました。最新の内容を確認してから保存してください');
    return res.status(200).json({updatedAt,revisions:{issue:Number(result[1]),root:Number(result[2]),remedy:Number(result[3])}});
   }
   const result=await db.eval(combined?KARTE_SCRIPT:SUMMARY_SCRIPT,[key],combined
    ? [body.root,body.remedy,body.revisions.root,body.revisions.remedy,updatedAt,TTL]
    : [body.field,body.value,body.revision,updatedAt,TTL]);
   if(Number(result[0])===-1)return fail(409,'ほかの人がまとめを更新しました。最新の内容を確認してから保存してください');
   if(combined)return res.status(200).json({updatedAt,revisions:{root:Number(result[1]),remedy:Number(result[2])}});
   return res.status(200).json({updatedAt,revision:Number(result[1])});
  }catch(error){console.error('API failure:',route,error.name);return fail(503,'通信に失敗しました。入力はこの端末に残っています。時間をおいて再試行してください');}
 };
}
