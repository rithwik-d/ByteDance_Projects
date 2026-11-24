'use strict';const test=require('node:test'),assert=require('node:assert/strict');
const{createServer}=require('../src/server'),{MemoryStore,fixtureRun}=require('../src/core');
test('HTTP metrics, impact, ingest and duplicate',async()=>{
 const store=new MemoryStore();for(let i=0;i<6;i++)await store.insert(fixtureRun(i));const server=createServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const base=`http://127.0.0.1:${server.address().port}`;
 const metric=await (await fetch(base+'/api/metrics')).json();assert.equal(metric.total,6);
 const impact=await (await fetch(base+'/api/impact?modules=module-1')).json();assert.ok(impact.tests.length>0);
 const opts={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(fixtureRun(999))};assert.equal((await fetch(base+'/api/runs',opts)).status,201);assert.equal((await fetch(base+'/api/runs',opts)).status,409);
 const runs=await (await fetch(base+'/api/runs')).json();assert.equal(runs.runs.length,7);
 }finally{await new Promise(r=>server.close(r))}
});
