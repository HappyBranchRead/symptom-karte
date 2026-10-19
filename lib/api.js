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
 return {group,root:hash.root??legacy.root??'',remedy:hash.remedy??legacy.remedy??'',revisions:{root:Number(hash.rootRev||0),remedy:Number(hash.remedyRev||0)},posts,legacy:{causes:legacy.causes||'',links:legacy.links||''},updatedAt:hash.updatedAt||legacy.updatedAt||null};
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
    if(!body||!['root','remedy'].includes(body.field)||typeof body.value!=='string'||body.value.length>2000||!Number.isSafeInteger(body.revision)||body.revision<0)return fail(400,'まとめは2,000文字以内で入力してください');
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
   const result=await db.eval(SUMMARY_SCRIPT,[key],[body.field,body.value,body.revision,updatedAt,TTL]);
   if(Number(result[0])===-1)return fail(409,'ほかの人がまとめを更新しました。最新の内容を確認してから保存してください');
   return res.status(200).json({updatedAt,revision:Number(result[1])});
  }catch(error){console.error('API failure:',route,error.name);return fail(503,'通信に失敗しました。入力はこの端末に残っています。時間をおいて再試行してください');}
 };
}
