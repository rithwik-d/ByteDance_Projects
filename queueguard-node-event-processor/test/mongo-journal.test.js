'use strict';const test=require('node:test'),assert=require('node:assert/strict');const{MongoJournal}=require('../storage/mongo');
test('MongoDB adapter honors a unique event id',async()=>{
 const docs=new Map();const fake={collection(name){return name==='job_events'?{
  async insertOne(x){if(docs.has(x._id)){let e=new Error('duplicate');e.code=11000;throw e}docs.set(x._id,x)},
  async bulkWrite(ops){for(const op of ops){const{id}=op.updateOne.filter;const k=op.updateOne.filter._id;Object.assign(docs.get(k),op.updateOne.update.$set)}},
  find(q){return{async toArray(){return [...docs.values()].filter(x=>x.status===q.status)}}},
  aggregate(){return{async toArray(){return[]}}}
 }:{};}};
 const j=new MongoJournal(fake);assert.equal(await j.accepted({id:'evt-1',type:'search.index'}),true);assert.equal(await j.accepted({id:'evt-1',type:'search.index'}),false);assert.equal((await j.pending()).length,1);
 await j.recordBatch({jobs:[],done:[{id:'evt-1',attempts:2}],dead:[]});assert.equal((await j.pending()).length,0);assert.equal(docs.get('evt-1').status,'processed');
});
