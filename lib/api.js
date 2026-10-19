import { timingSafeEqual } from 'node:crypto';
export const TTL = 604800;
export const fields = ['causes', 'links', 'root', 'remedy'];
export const empty = () => ({causes:'',links:'',root:'',remedy:'',updatedAt:null});
export function authorized(pass) {
  const expected = process.env.ADMIN_PASS;
  if (!expected || expected.length < 8 || typeof pass !== 'string') return false;
  const a = Buffer.from(pass), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a,b);
}
export function validate(body) {
  if (!body || fields.some(key => typeof body[key] !== 'string' || body[key].length > 2000)) {
    const error = new Error('4項目はそれぞれ2,000文字以内の文字列で入力してください'); error.status = 400; throw error;
  }
  return Object.fromEntries(fields.map(key=>[key,body[key]]));
}
export function redisConfig(env = process.env) {
 const families = ['UPSTASH_REDIS_REST_', 'KV_REST_API_'];
 const pair = prefix => {
  for (const family of families) {
   const url = env[prefix + family + 'URL'];
   const token = env[prefix + family + 'TOKEN'];
   if (url && token) return {url, token};
  }
 };
 // Prefer explicit standard names. Never combine different databases' credentials.
 const standard = pair('');
 if (standard) return standard;
 const prefixes = new Set();
 for (const name of Object.keys(env)) {
  for (const family of families) {
   const suffix = family + 'URL';
   if (name.endsWith('_' + suffix)) prefixes.add(name.slice(0, -suffix.length));
  }
 }
 const candidates = [...prefixes].map(pair).filter(Boolean);
 if (candidates.length === 1) return candidates[0];
 throw new Error(candidates.length ? 'Multiple Redis REST connections; set standard environment variable names' : 'Redis REST URL and TOKEN pair is missing');
}
async function redisClient() {
 const config = redisConfig();
 const { Redis } = await import('@upstash/redis');
 return new Redis(config);
}
export function createHandler(route, getRedis = redisClient) {
 return async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  const fail=(status,error)=>res.status(status).json({error});
  const allowed={karte:['GET','PUT'],phase:['GET','POST'],all:['GET'],reset:['POST'],login:['POST']}[route];
  if(!allowed.includes(req.method)){res.setHeader('Allow',allowed.join(', '));return fail(405,'許可されていないメソッドです');}
  try {
   let body=req.body;
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{return fail(400,'JSON形式が不正です');}}
   const admin=authorized(req.headers['x-admin-pass']);
   if(route==='login') return authorized(body?.pass)?res.status(200).json({ok:true}):fail(401,'合言葉が違います');
   if((route==='reset'||(route==='phase'&&req.method==='POST'))&&!admin) return fail(401,'合言葉を確認してください');
   let group;
   if(route==='karte'){
    if(!/^[1-4]$/.test(String(req.query.group ?? '')) || Array.isArray(req.query.group))return fail(400,'グループは1〜4で指定してください');
    group=Number(req.query.group);
    if(req.method==='PUT')body=validate(body);
   }
   if(route==='phase'&&req.method==='POST'&&!['work','open'].includes(body?.phase))return fail(400,'フェーズが不正です');
   const db=await getRedis();
   if(route==='karte'){
    if(req.method==='GET')return res.status(200).json((await db.get(`karte:${group}`))||empty());
    const updatedAt=new Date().toISOString(); await db.set(`karte:${group}`,{...body,updatedAt},{ex:TTL});return res.status(200).json({updatedAt});
   }
   if(route==='phase'){
    if(req.method==='GET')return res.status(200).json({phase:(await db.get('phase'))||'work'});
    await db.set('phase',body.phase,{ex:TTL});return res.status(200).json({phase:body.phase});
   }
   if(route==='all'){
    const phase=(await db.get('phase'))||'work';
    if(!admin&&phase!=='open')return fail(req.headers['x-admin-pass']?401:403,'ワーク中は他グループの内容を取得できません');
    const values=await db.mget('karte:1','karte:2','karte:3','karte:4');
    return res.status(200).json({phase,groups:values.map((v,i)=>({group:i+1,...(v||empty())}))});
   }
   const tx=db.multi();tx.del('karte:1','karte:2','karte:3','karte:4');tx.set('phase','work',{ex:TTL});await tx.exec();return res.status(200).json({ok:true,phase:'work'});
  }catch(error){if(error.status===400)return fail(400,error.message); console.error('API failure:',route,error.name);return fail(503,'通信に失敗しました。接続設定を確認して再試行してください');}
 };
}
