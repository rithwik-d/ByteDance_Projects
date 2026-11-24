'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{execFile}=require('node:child_process');
const binary=path.join(__dirname,'build','buildgraph'),modules=path.join(__dirname,'data','modules.csv'),tests=path.join(__dirname,'data','tests.csv');
function runCommand(args){return new Promise((resolve,reject)=>execFile(binary,[modules,tests,...args],{timeout:5000,maxBuffer:1000000},(e,stdout,stderr)=>e?reject(Error(stderr||e.message)):resolve(JSON.parse(stdout))))}
function createServer(){let html=fs.readFileSync(path.join(__dirname,'web','index.html'),'utf8');return http.createServer(async(req,res)=>{
 try{const u=new URL(req.url,'http://localhost');let value,code=200,type='application/json';
 if(req.method==='GET'&&u.pathname==='/'){value=html;type='text/html'}
 else if(req.method==='GET'&&u.pathname==='/api/stats')value=await runCommand(['stats']);
 else if(req.method==='GET'&&u.pathname==='/api/impact'){
  const a=(u.searchParams.get('modules')||'').split(',').filter(Boolean);if(!a.length||a.length>10||a.some(x=>!/^module-\d{1,2}$/.test(x)))throw Error('provide 1-10 valid module ids');
  value=await runCommand(['impact',...a]);
 }else{code=404;value={error:'not found'}}
 res.writeHead(code,{'content-type':type+'; charset=utf-8','x-content-type-options':'nosniff'});res.end(typeof value==='string'?value:JSON.stringify(value));
 }catch(e){res.writeHead(400,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}))}
})}
if(require.main===module){const s=createServer();s.listen(Number(process.env.PORT||8084),'127.0.0.1',()=>console.log(`BuildGraph http://127.0.0.1:${s.address().port}`))}
module.exports={createServer,runCommand};
