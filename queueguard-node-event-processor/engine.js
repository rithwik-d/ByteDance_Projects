'use strict';
/** Educational asynchronous job-event processor. No dependencies. In-memory only. */
class QueueEngine {
  constructor({maxAttempts=3,capacity=30000}={}) {
    this.maxAttempts=maxAttempts;this.capacity=capacity;
    this.jobs=[];this.ids=new Set();this.dead=[];this.done=[];
    this.stats={received:0,duplicates:0,retried:0,processed:0,deadLettered:0};
  }
  enqueue(event) {
    if(!event || typeof event.id!=='string'||!/^evt-[A-Za-z0-9_-]{1,50}$/.test(event.id)) throw new Error('invalid id');
    if(!['search.index','application.received','notification.send'].includes(event.type))throw new Error('invalid event type');
    const failures=event.failuresBeforeSuccess??0;
    if(!Number.isInteger(failures)||failures<0||failures>10)throw new Error('invalid failuresBeforeSuccess');
    if(this.ids.has(event.id)){this.stats.duplicates++;return{accepted:false,reason:'duplicate'};}
    if(this.jobs.length>=this.capacity)throw new Error('queue capacity reached');
    this.ids.add(event.id);this.stats.received++;
    this.jobs.push({id:event.id,type:event.type,attempts:0,failuresBeforeSuccess:failures,nextDue:0});
    return{accepted:true,id:event.id};
  }
  processDue(now=Date.now(),limit=100){
    let visited=0;
    for(let i=0;i<this.jobs.length && visited<limit;){
      let j=this.jobs[i];if(j.nextDue>now){i++;continue;}
      visited++;j.attempts++;
      if(j.attempts<=j.failuresBeforeSuccess){
        if(j.attempts>=this.maxAttempts){this.dead.push({...j,reason:'retries exhausted'});this.stats.deadLettered++;this.jobs.splice(i,1);}
        else{this.stats.retried++;j.nextDue=now+10*2**(j.attempts-1);i++;}
      }else{this.done.push({...j});this.stats.processed++;this.jobs.splice(i,1);}
    }
    return visited;
  }
  flushVirtual(maxRounds=25){
    let clock=Date.now();let rounds=0;
    while(this.jobs.length && rounds++<maxRounds){this.processDue(clock,this.capacity);clock+=250;}
    if(this.jobs.length)throw new Error('virtual flush unfinished');
  }
  metrics(){return{...this.stats,queued:this.jobs.length,success:this.done.length,deadLetters:this.dead.length};}
}
module.exports={QueueEngine};
