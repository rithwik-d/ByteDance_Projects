'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const{MongoJournal}=require('./storage/mongo'),{QueueEngine}=require('./engine');
function reply(res,code,obj,type='application/json'){res.writeHead(code,{'content-type':type+'; charset=utf-8','x-content-type-options':'nosniff'});res.end(typeof obj==='string'?obj:JSON.stringify(obj))}
(async()=>{
 const journal=await MongoJournal.connect(process.env.MONGODB_URI);const queue=new QueueEngine();
 for(const old of await journal.pending())queue.enqueue({id:old._id,type:old.type,failuresBeforeSuccess:old.failuresBeforeSuccess});
 const html=fs.readFileSync(path.join(__dirname,'web','index.html'),'utf8');
 const server=http.createServer(async(req,res)=>{
 try{const p=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&p==='/')return reply(res,200,html,'text/html');
 if(req.method==='GET'&&p==='/api/health')return reply(res,200,{status:'ok',mongo:'connected'});
 if(req.method==='GET'&&p==='/api/metrics')return reply(res,200,{...queue.metrics(),persisted:await journal.summary()});
 if(req.method==='GET'&&p==='/api/events')return reply(res,200,{queued:queue.jobs.slice(0,30),completed:queue.done.slice(-30),deadLetters:queue.dead.slice(-30)});
 if(req.method==='POST'&&p==='/api/events'){
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)return reply(res,413,{error:'payload too large'})}
  const event=JSON.parse(raw); // pre-validate before persistence
  if(typeof event?.id!=='string'||!/^evt-[A-Za-z0-9_-]{1,50}$/.test(event.id)||!['search.index','application.received','notification.send'].includes(event.type)||!Number.isInteger(event.failuresBeforeSuccess??0)||event.failuresBeforeSuccess<0||event.failuresBeforeSuccess>10)throw Error('invalid event');
  if(!(await journal.accepted(event)))return reply(res,409,{accepted:false,reason:'persistent duplicate'});
  const out=queue.enqueue(event);return reply(res,out.accepted?201:409,out);
 }
 return reply(res,404,{error:'not found'});
 }catch(e){return reply(res,400,{error:e.message})}
 });
 // Persistence is periodically reconciled; requests are processed locally.
 let busy=false;const timer=setInterval(async()=>{if(busy)return;busy=true;try{queue.processDue(Date.now(),100);await journal.recordBatch(queue)}catch(e){console.error('journal sync:',e.message)}finally{busy=false}},100);
 const port=Number(process.env.PORT||8092);server.listen(port,'127.0.0.1',()=>console.log(`QueueGuard + MongoDB http://127.0.0.1:${port}`));
 process.on('SIGINT',()=>{clearInterval(timer);server.close(async()=>{await journal.close();process.exit(0)})});
})().catch(e=>{console.error(e);process.exitCode=1});
