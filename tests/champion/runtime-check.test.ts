import {test} from 'node:test';
import assert from 'node:assert/strict';
import {checkRuntime} from '../../scripts/runtime-check.ts';
const response=(status:number,body:unknown)=>async()=>new Response(JSON.stringify(body),{status});
test('healthy runtime requires a real 200 and explicit non-drill state',async()=>{
 assert.equal((await checkRuntime(response(200,{status:'ok',drill:false}))).ok,true);
 for(const fetcher of [response(200,{status:'ok'}),response(503,{status:'ok',drill:false}),response(200,{status:'ok',drill:true})])
  assert.equal((await checkRuntime(fetcher)).ok,false);
});
test('unacknowledged errors and drills both fail and preserve the drill label',async()=>{
 for(const drill of [false,true]){
  const result=await checkRuntime(response(503,{status:'error_pending',drill}));
  assert.equal(result.ok,false);assert.equal(result.drill,drill);
 }
});
test('connection errors and unexpected bodies fail without leaking provider details',async()=>{
 const secret='DO_NOT_DISCLOSE';
 const failed=await checkRuntime(async()=>{throw new Error(secret);});
 const malformed=await checkRuntime(async()=>new Response(secret,{status:502}));
 assert.equal(failed.ok,false);assert.equal(malformed.ok,false);
 assert.doesNotMatch(JSON.stringify([failed,malformed]),new RegExp(secret));
});
