import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,TTL,redisConfig,board} from '../lib/api.js';
function setup(){
 const store=new Map(),expirations=new Map();
 const db={
  hgetall:async key=>store.get(key),
  async eval(script,keys,args){
   const [issue,root,remedy,expectedIssue,expectedRoot,expectedRemedy,updatedAt,ttl]=args,key=keys[0],hash=store.get(key)||{},issueRev=Number(hash.issueRev||0),rootRev=Number(hash.rootRev||0),remedyRev=Number(hash.remedyRev||0);
   if(issueRev!==expectedIssue||rootRev!==expectedRoot||remedyRev!==expectedRemedy)return [-1,issueRev,rootRev,remedyRev];
   store.set(key,{...hash,issue,root,remedy,issueRev:issueRev+1,rootRev:rootRev+1,remedyRev:remedyRev+1,updatedAt});expirations.set(key,ttl);return [1,issueRev+1,rootRev+1,remedyRev+1];
  }
 };
 return {store,expirations,async call(route,method='GET',body,group='1'){
  let status=200,result,headers={};const req={method,body,headers:{},query:{group}};
  const res={setHeader:(k,v)=>headers[k]=v,status(n){status=n;return this;},json(v){result=v;}};
  await createHandler(route,()=>db)(req,res);return {status,result,headers};
 }};
}
const valid={issue:'問題',root:'仮説',remedy:'処方',revisions:{issue:0,root:0,remedy:0}};
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
 const s=setup(),r=await s.call('all');assert.equal(r.status,200);assert.equal(r.result.groups.length,4);assert.equal(r.headers['Cache-Control'],'no-store');
 assert.deepEqual(r.result.groups[0],{group:1,issue:'',root:'',remedy:'',revisions:{issue:0,root:0,remedy:0},updatedAt:null});
});
test('raw Redis replies preserve numeric-looking text',()=>{
 const card=board(1,['root','123','rootRev','1','remedy','false']);
 assert.equal(card.root,'123');assert.equal(card.remedy,'false');assert.equal(card.revisions.root,1);
});
test('workshop saves the selected issue, hypothesis and experiment atomically with TTL',async()=>{
 const s=setup();
 const result=await s.call('karte','PUT',{issue:'今回扱う問題',root:'原因の仮説',remedy:'試すことと確かめ方',revisions:{issue:0,root:0,remedy:0}});
 assert.equal(result.status,200);assert.deepEqual(result.result.revisions,{issue:1,root:1,remedy:1});
 const card=(await s.call('all')).result.groups[0];
 assert.equal(card.issue,'今回扱う問題');assert.equal(card.root,'原因の仮説');assert.equal(card.remedy,'試すことと確かめ方');
 assert.equal(s.expirations.get('board:1'),TTL);
 assert.equal((await s.call('karte','GET',null,'2')).result.root,'');
});
test('a stale revision in any field prevents a partial three-field save',async()=>{
 const s=setup();
 await s.call('karte','PUT',{...valid,issue:'他の参加者が選んだ問題'});
 for(const revisions of [{issue:0,root:1,remedy:1},{issue:1,root:0,remedy:1},{issue:1,root:1,remedy:0}]){
  assert.equal((await s.call('karte','PUT',{issue:'上書き',root:'上書き',remedy:'上書き',revisions})).status,409);
 }
 const card=(await s.call('karte')).result;
 assert.equal(card.issue,'他の参加者が選んだ問題');assert.equal(card.root,'仮説');assert.deepEqual(card.revisions,{issue:1,root:1,remedy:1});
});
test('concurrent saves from the same revision keep exactly one complete chart',async()=>{
 const s=setup();
 const results=await Promise.all(['A','B'].map(value=>s.call('karte','PUT',{...valid,issue:value,root:value,remedy:value})));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const card=(await s.call('karte')).result;assert.equal(card.issue,card.root);assert.equal(card.root,card.remedy);
});
test('validation rejects invalid groups and incomplete three-field saves',async()=>{
 const s=setup();for(const group of ['0','5','1.0','01','2x',['1','2'],''])assert.equal((await s.call('karte','GET',null,group)).status,400);
 for(const body of [{},null,{root:'仮説',remedy:'処方',revisions:{root:0,remedy:0}},{...valid,issue:1},{...valid,issue:'a'.repeat(2001)},{...valid,root:'a'.repeat(2001)},{...valid,revisions:{root:0,remedy:0}},{...valid,revisions:{issue:-1,root:0,remedy:0}},{...valid,revisions:{issue:0,root:0}}])assert.equal((await s.call('karte','PUT',body)).status,400);
 assert.equal((await s.call('karte','PUT',{...valid,issue:'a'.repeat(2000)})).status,200);
});
test('HTML input is stored as text; unknown attributes are discarded',async()=>{
 const s=setup();await s.call('karte','PUT',{...valid,issue:'<script>alert(1)</script>',secret:'ignored'});
 const card=(await s.call('karte')).result;assert.equal(card.issue,'<script>alert(1)</script>');assert.equal(card.secret,undefined);assert.equal(s.store.get('board:1').secret,undefined);
});
test('unsupported routes and methods, malformed JSON and Redis failure return JSON errors',async()=>{
 const s=setup();assert.equal((await s.call('karte','DELETE')).status,405);assert.equal((await s.call('unknown','POST',{})).status,405);assert.equal((await s.call('all','PUT',valid)).status,405);assert.equal((await s.call('karte','PUT','{bad')).status,400);let status,result;
 await createHandler('karte',()=>{throw Error('offline');})({method:'GET',headers:{},query:{group:'1'}},{setHeader(){},status(n){status=n;return this;},json(v){result=v;}});assert.equal(status,503);assert.ok(result.error);
});
