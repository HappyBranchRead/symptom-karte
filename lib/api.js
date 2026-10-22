import {redisClient} from './redis.js';
export {redisConfig} from './redis.js';
export const TTL=604800;
export function board(group,hash={}){
 if(Array.isArray(hash)){
  const values=hash;hash={};
  for(let i=0;i<values.length;i+=2)hash[values[i]]=values[i+1];
 }
 hash=hash||{};
 return {group,issue:hash.issue??'',root:hash.root??'',remedy:hash.remedy??'',revisions:{issue:Number(hash.issueRev||0),root:Number(hash.rootRev||0),remedy:Number(hash.remedyRev||0)},updatedAt:hash.updatedAt||null};
}
// The issue, hypothesis and experiment are checked and written together: a conflict never causes a partial save.
export const WORKSHOP_SCRIPT=`
local issueRev = tonumber(redis.call('HGET', KEYS[1], 'issueRev') or '0')
local rootRev = tonumber(redis.call('HGET', KEYS[1], 'rootRev') or '0')
local remedyRev = tonumber(redis.call('HGET', KEYS[1], 'remedyRev') or '0')
if issueRev ~= tonumber(ARGV[4]) or rootRev ~= tonumber(ARGV[5]) or remedyRev ~= tonumber(ARGV[6]) then return {-1, issueRev, rootRev, remedyRev} end
redis.call('HSET', KEYS[1], 'issue', ARGV[1], 'root', ARGV[2], 'remedy', ARGV[3], 'issueRev', issueRev + 1, 'rootRev', rootRev + 1, 'remedyRev', remedyRev + 1, 'updatedAt', ARGV[7])
redis.call('EXPIRE', KEYS[1], ARGV[8])
return {1, issueRev + 1, rootRev + 1, remedyRev + 1}
`;
const METHODS=new Map([['all',['GET']],['karte',['GET','PUT']]]);
export function createHandler(route,getRedis=redisClient){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const fail=(status,error)=>res.status(status).json({error});
  const allowed=METHODS.get(route);
  if(!allowed||!allowed.includes(req.method)){res.setHeader('Allow',(allowed||[]).join(', '));return fail(405,'許可されていないメソッドです');}
  try{
   let group;
   if(route!=='all'){
    if(!/^[1-4]$/.test(String(req.query.group??''))||Array.isArray(req.query.group))return fail(400,'グループは1〜4で指定してください');
    group=Number(req.query.group);
   }
   let body=req.body;
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{return fail(400,'JSON形式が不正です');}}
   if(req.method==='PUT'){
    const validText=value=>typeof value==='string'&&value.length<=2000;
    const validRevision=value=>Number.isSafeInteger(value)&&value>=0;
    const valid=body&&validText(body.issue)&&validText(body.root)&&validText(body.remedy)&&validRevision(body.revisions?.issue)&&validRevision(body.revisions?.root)&&validRevision(body.revisions?.remedy);
    if(!valid)return fail(400,'着目した問題・原因の仮説・試す処方はそれぞれ2,000文字以内で入力し、最新の版番号を指定してください');
   }
   const db=await getRedis();
   if(route==='all'){
    const hashes=await Promise.all([1,2,3,4].map(g=>db.hgetall(`board:${g}`)));
    return res.status(200).json({groups:hashes.map((hash,i)=>board(i+1,hash))});
   }
   const key=`board:${group}`;
   if(req.method==='GET')return res.status(200).json(board(group,await db.hgetall(key)));
   const updatedAt=new Date().toISOString();
   const result=await db.eval(WORKSHOP_SCRIPT,[key],[body.issue,body.root,body.remedy,body.revisions.issue,body.revisions.root,body.revisions.remedy,updatedAt,TTL]);
   if(Number(result[0])===-1)return fail(409,'ほかの人がカルテを更新しました。最新の内容を確認してから保存してください');
   return res.status(200).json({updatedAt,revisions:{issue:Number(result[1]),root:Number(result[2]),remedy:Number(result[3])}});
  }catch(error){console.error('API failure:',route,error.name);return fail(503,'通信に失敗しました。この画面を閉じずに、時間をおいて再度保存してください');}
 };
}
