'use strict';
/** Optional persistence bridge. The queue's core algorithms can be tested without MongoDB. */
class MongoJournal {
  constructor(db){this.db=db;this.events=db.collection('job_events');this.audit=db.collection('job_audit')}
  static async connect(url, dbName='queueguard'){
    if(!url)throw new Error('MONGODB_URI is required');
    let MongoClient;try{({MongoClient}=require('mongodb'))}catch{throw new Error('Install mongodb driver with npm install')}
    const client=new MongoClient(url,{serverSelectionTimeoutMS:5000});await client.connect();
    const journal=new MongoJournal(client.db(dbName));journal.client=client;
    await journal.events.createIndex({status:1,updated_at:-1});
    await journal.audit.createIndex({event_id:1,created_at:-1});
    return journal;
  }
  async accepted(event){
    // _id enforces global idempotency even across service restarts.
    try{await this.events.insertOne({_id:event.id,type:event.type,failuresBeforeSuccess:event.failuresBeforeSuccess??0,status:'queued',attempts:0,updated_at:new Date()});return true}
    catch(e){if(e?.code===11000)return false;throw e}
  }
  async recordBatch(queue){
    // Demonstration reconciliation; not a distributed transactional queue.
    const now=new Date(),ops=[];
    for(const j of queue.jobs)ops.push({updateOne:{filter:{_id:j.id},update:{$set:{status:'queued',attempts:j.attempts,updated_at:now}}}});
    for(const j of queue.done)ops.push({updateOne:{filter:{_id:j.id},update:{$set:{status:'processed',attempts:j.attempts,updated_at:now}}}});
    for(const j of queue.dead)ops.push({updateOne:{filter:{_id:j.id},update:{$set:{status:'dead',attempts:j.attempts,updated_at:now}}}});
    if(ops.length)await this.events.bulkWrite(ops,{ordered:false});
  }
  async pending(){return this.events.find({status:'queued'}).toArray()}
  async summary(){return this.events.aggregate([{$group:{_id:'$status',count:{$sum:1}}}]).toArray()}
  async close(){if(this.client)await this.client.close()}
}
module.exports={MongoJournal};
