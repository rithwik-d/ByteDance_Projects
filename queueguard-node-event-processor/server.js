'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');
const {QueueEngine}=require('./engine');const queue=new QueueEngine();
const page=fs.readFileSync(path.join(__dirname,'web','index.html'));
const port=Number(process.env.PORT||8092);
function send(res,code,body,type='application/json'){
 res.writeHead(code,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(typeof body==='string'?body:JSON.stringify(body));
}
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'&&req.method==='GET')return send(res,200,page.toString('utf8'),'text/html');
 if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{status:'ok',queueDepth:queue.jobs.length});
 if(pathname==='/api/metrics'&&req.method==='GET')return send(res,200,queue.metrics());
 if(pathname==='/api/events'&&req.method==='GET')return send(res,200,{queued:queue.jobs.slice(0,30),completed:queue.done.slice(-25).reverse(),deadLetters:queue.dead.slice(-25).reverse()});
 if(pathname==='/api/events'&&req.method==='POST'){
  let data='';for await(const chunk of req){data+=chunk.toString('utf8');if(data.length>8192)return send(res,413,{error:'request too large'});}
  try{const out=queue.enqueue(JSON.parse(data));return send(res,out.accepted?201:409,out);}catch(e){return send(res,400,{error:e.message});}
 }
 return send(res,404,{error:'not found'});
});
const worker=setInterval(()=>queue.processDue(Date.now(),100),20);
server.listen(port,'127.0.0.1',()=>console.log(`QueueGuard http://127.0.0.1:${port}`));
process.on('SIGINT',()=>{clearInterval(worker);server.close(()=>process.exit(0))});
