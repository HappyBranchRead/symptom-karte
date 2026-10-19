import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,TTL,redisConfig,board} from '../lib/api.js';
const uuid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
function setup(){
 const store=new Map(),expirations=new Map();
 const db={
  get:async key=>store.get(key),mget:async(...keys)=>keys.map(k=>store.get(k)),hgetall:async key=>store.get(key),
  multi(){const ops=[];return {hset(key,values){ops.push(()=>store.set(key,{...(store.get(key)||{}),...values}));},expire(key,ttl){ops.push(()=>expirations.set(key,ttl));},async exec(){ops.forEach(op=>op());}};},
  async eval(script,keys,args){
   if(args.length===6){
    const [root,remedy,expectedRoot,expectedRemedy,updatedAt,ttl]=args,key=keys[0],hash=store.get(key)||{},rootRev=Number(hash.rootRev||0),remedyRev=Number(hash.remedyRev||0);
    if(rootRev!==expectedRoot||remedyRev!==expectedRemedy)return [-1,rootRev,remedyRev];
    store.set(key,{...hash,root,remedy,rootRev:rootRev+1,remedyRev:remedyRev+1,updatedAt});expirations.set(key,ttl);return [1,rootRev+1,remedyRev+1];
   }
   const [field,value,expected,updatedAt,ttl]=args,key=keys[0],hash=store.get(key)||{},revision=Number(hash[field+'Rev']||0);if(revision!==expected)return [-1,revision];store.set(key,{...hash,[field]:value,[field+'Rev']:revision+1,updatedAt});expirations.set(key,ttl);return [1,revision+1];}
 };
 return {store,expirations,async call(route,method='GET',body,group='1'){
  let status=200,result,headers={};const req={method,body,headers:{},query:{group}};
  const res={setHeader:(k,v)=>headers[k]=v,status(n){status=n;return this;},json(v){result=v;}};
  await createHandler(route,()=>db)(req,res);return {status,result,headers};
 }};
}
test('Redis supports standard and Marketplace-prefixed REST credentials',()=>{
 const config={url:'https://example.upstash.io',token:'test-token'};
 for(const prefix of ['', 'example_', 'another_store_']){
  for(const family of ['KV_REST_API_', 'UPSTASH_REDIS_REST_']){
   assert.deepEqual(redisConfig({[prefix+family+'URL']:config.url,[prefix+family+'TOKEN']:config.token}),config);
  }
 }
 assert.deepEqual(redisConfig({example_KV_REST_API_URL:config.url,example_KV_REST_API_TOKEN:config.token,example_KV_REST_API_READ_ONLY_TOKEN:'read-only'}),config);
});
test('Redis never mixes incomplete pairs and rejects ambiguous databases',()=>{
 assert.throws(()=>redisConfig({example_KV_REST_API_URL:'https://a',other_KV_REST_API_TOKEN:'b'}),/missing/);
 assert.throws(()=>redisConfig({REDIS_URL:'redis://example'}),/missing/);
 assert.throws(()=>redisConfig({a_KV_REST_API_URL:'https://a',a_KV_REST_API_TOKEN:'a',b_KV_REST_API_URL:'https://b',b_KV_REST_API_TOKEN:'b'}),/Multiple/);
 assert.deepEqual(redisConfig({KV_REST_API_URL:'https://standard',KV_REST_API_TOKEN:'standard',example_KV_REST_API_URL:'https://custom',example_KV_REST_API_TOKEN:'custom'}),{url:'https://standard',token:'standard'});
});

test('all groups are readable without login or phase controls',async()=>{
 const s=setup(),r=await s.call('all');assert.equal(r.status,200);assert.equal(r.result.groups.length,4);assert.equal(r.headers['Cache-Control'],'no-store');assert.deepEqual(r.result.groups[0].posts,[]);
});
test('raw Redis replies preserve numeric-looking text and decode legacy JSON',()=>{
 const card=board(1,['root','123','rootRev','1','remedy','false'],JSON.stringify({causes:'以前の議論',links:''}));
 assert.equal(card.root,'123');assert.equal(card.remedy,'false');assert.equal(card.revisions.root,1);assert.equal(card.legacy.causes,'以前の議論');
});
test('simultaneous contributions are retained and retry IDs do not duplicate posts',async()=>{
 const s=setup();const requests=Array.from({length:20},(_,i)=>({id:uuid(i),text:'気づき'+i,kind:i%2?'remedy':'cause'}));
 const results=await Promise.all(requests.map(body=>s.call('posts','POST',body)));assert.ok(results.every(r=>r.status===200));
 await s.call('posts','POST',requests[0]);const card=(await s.call('karte')).result;
 assert.equal(card.posts.length,20);assert.equal(new Set(card.posts.map(p=>p.text)).size,20);assert.equal(s.expirations.get('board:1'),TTL);
 assert.equal((await s.call('karte','GET',null,'2')).result.posts.length,0);
});
test('independent summary fields save concurrently; stale edits are rejected',async()=>{
 const s=setup();const results=await Promise.all(['root','remedy'].map(field=>s.call('karte','PUT',{field,value:field,revision:0})));assert.ok(results.every(r=>r.status===200));
 const stale=await s.call('karte','PUT',{field:'root',value:'overwrite',revision:0});assert.equal(stale.status,409);
 const concurrent=await Promise.all(['a','b'].map(value=>s.call('karte','PUT',{field:'root',value,revision:1})));assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
 const card=(await s.call('karte')).result;assert.equal(card.revisions.root,2);assert.equal(card.remedy,'remedy');assert.equal(s.expirations.get('board:1'),TTL);
});
test('existing saved cards remain readable and blank new summaries override legacy values',async()=>{
 const s=setup();s.store.set('karte:1',{causes:'既存の原因',links:'既存の関係',root:'既存のまとめ',remedy:'既存の打ち手'});
 let card=(await s.call('karte')).result;assert.equal(card.root,'既存のまとめ');assert.equal(card.legacy.causes,'既存の原因');
 await s.call('karte','PUT',{field:'root',value:'',revision:0});card=(await s.call('all')).result.groups[0];assert.equal(card.root,'');assert.equal(card.remedy,'既存の打ち手');assert.equal(card.legacy.links,'既存の関係');
});
test('validation rejects invalid group, posts and summary payloads',async()=>{
 const s=setup();for(const group of ['0','5','1.0','01','2x',['1','2'],''])assert.equal((await s.call('karte','GET',null,group)).status,400);
 for(const body of [{},null,{id:uuid(1),text:' ',kind:'cause'},{id:uuid(1),text:'a'.repeat(501),kind:'cause'},{id:'bad',text:'x',kind:'cause'},{id:uuid(1),text:'x',kind:'other'}])assert.equal((await s.call('posts','POST',body)).status,400);
 for(const body of [{field:'causes',value:'x',revision:0},{field:'root',value:'a'.repeat(2001),revision:0},{field:'root',value:'x',revision:-1}])assert.equal((await s.call('karte','PUT',body)).status,400);
 assert.equal((await s.call('posts','POST',{id:uuid(2),text:'a'.repeat(500),kind:'cause'})).status,200);
});
test('HTML input is stored as text; unknown attributes are discarded',async()=>{
 const s=setup();await s.call('posts','POST',{id:uuid(1),text:'<script>alert(1)</script>',kind:'cause',secret:'ignored'});const post=(await s.call('karte')).result.posts[0];assert.equal(post.text,'<script>alert(1)</script>');assert.equal(post.secret,undefined);
});
test('unsupported methods, malformed JSON and Redis failure return JSON errors',async()=>{
 const s=setup();assert.equal((await s.call('karte','DELETE')).status,405);assert.equal((await s.call('posts','POST','{bad')).status,400);let status,result;
 await createHandler('karte',()=>{throw Error('offline');})({method:'GET',headers:{},query:{group:'1'}},{setHeader(){},status(n){status=n;return this;},json(v){result=v;}});assert.equal(status,503);assert.ok(result.error);
});

test('one group save persists both fields together and sets TTL',async()=>{
 const s=setup();const response=await s.call('karte','PUT',{root:'原因分析',remedy:'処方',revisions:{root:0,remedy:0}});
 assert.equal(response.status,200);assert.deepEqual(response.result.revisions,{root:1,remedy:1});
 const card=(await s.call('karte')).result;assert.equal(card.root,'原因分析');assert.equal(card.remedy,'処方');assert.equal(s.expirations.get('board:1'),TTL);
});
test('a conflict in either field prevents any partial group save',async()=>{
 const s=setup();await s.call('karte','PUT',{field:'remedy',value:'ほかの参加者の処方',revision:0});
 const stale=await s.call('karte','PUT',{root:'古い編集',remedy:'上書き',revisions:{root:0,remedy:0}});assert.equal(stale.status,409);
 const card=(await s.call('karte')).result;assert.equal(card.root,'');assert.equal(card.remedy,'ほかの参加者の処方');assert.deepEqual(card.revisions,{root:0,remedy:1});
 const results=await Promise.all(['a','b'].map(value=>s.call('karte','PUT',{root:value,remedy:value,revisions:{root:0,remedy:1}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const winner=(await s.call('karte')).result;assert.equal(winner.root,winner.remedy);
});
test('group save requires two valid fields and two valid revisions',async()=>{
 const s=setup(),valid={root:'原因',remedy:'処方',revisions:{root:0,remedy:0}};
 for(const body of [{...valid,root:1},{...valid,remedy:'a'.repeat(2001)},{...valid,revisions:{root:0}},{...valid,revisions:{root:-1,remedy:0}}])assert.equal((await s.call('karte','PUT',body)).status,400);
});
