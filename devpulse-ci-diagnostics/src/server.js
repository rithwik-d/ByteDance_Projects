'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const{MemoryStore,fixtureRun,impactedTests,summarize}=require('./core');
const index=fs.readFileSync(path.join(__dirname,'..','web','index.html'),'utf8');
function respond(res,status,obj,type='application/json') {res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(typeof obj==='string'?obj:JSON.stringify(obj))}
async function createStore(){if(process.env.STORAGE==='postgres'){const{PostgresStore}=require('./postgres');return PostgresStore.connect()}const s=new MemoryStore();for(let i=0;i<8000;i++)await s.insert(fixtureRun(i));return s}
function createServer(store){return http.createServer(async(req,res)=>{
 try {
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&u.pathname==='/')return respond(res,200,index,'text/html');
  if(req.method==='GET'&&u.pathname==='/api/health')return respond(res,200,{status:'ok',storage:process.env.STORAGE==='postgres'?'postgres':'memory'});
  if(req.method==='GET'&&u.pathname==='/api/metrics')return respond(res,200,summarize(await store.all()));
  if(req.method==='GET'&&u.pathname==='/api/runs')return respond(res,200,{runs:await store.list(Math.min(250,Math.max(1,Number(u.searchParams.get('limit')||30))))});
  if(req.method==='GET'&&u.pathname==='/api/impact')return respond(res,200,{modules:(u.searchParams.get('modules')||'').split(',').filter(Boolean),tests:impactedTests((u.searchParams.get('modules')||'').split(',').filter(Boolean))});
  if(req.method==='POST'&&u.pathname==='/api/runs'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>10000)return respond(res,413,{error:'too large'})}
    const accepted=await store.insert(JSON.parse(body));return respond(res,accepted?201:409,{accepted});
  }
  return respond(res,404,{error:'not found'});
 }catch(e){return respond(res,400,{error:e.message})}
})}
if(require.main===module){createStore().then(store=>{const server=createServer(store);server.listen(Number(process.env.PORT||8083),'127.0.0.1',()=>console.log('DevPulse http://127.0.0.1:'+server.address().port));}).catch(e=>{console.error(e.message);process.exitCode=1})}
module.exports={createServer,createStore};
