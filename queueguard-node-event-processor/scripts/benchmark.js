'use strict';const{QueueEngine}=require('../engine');
const q=new QueueEngine();const start=performance.now();
for(let i=0;i<10000;i++){
 const fail=i<200?1:(i<220?10:0);
 q.enqueue({id:'evt-'+i,type:i%3===0?'search.index':i%3===1?'application.received':'notification.send',failuresBeforeSuccess:fail});
}
for(let i=0;i<100;i++)q.enqueue({id:'evt-'+i,type:'search.index'});
q.flushVirtual();const ms=performance.now()-start;const m=q.metrics();
console.log(JSON.stringify({syntheticUniqueEvents:10000,duplicateSubmissions:100,metrics:m,elapsedInProcessMs:Number(ms.toFixed(2)),benchmarkScope:'local, in-process synchronous simulation; not real network throughput'},null,2));
if(m.processed!==9980||m.deadLettered!==20||m.retried!==240||m.duplicates!==100||m.queued!==0)process.exitCode=1;
