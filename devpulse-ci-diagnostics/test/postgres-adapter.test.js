'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const{PostgresStore}=require('../src/postgres'),{fixtureRun}=require('../src/core');
test('PostgreSQL adapter uses parameterized INSERT and conflict-safe IDs',async()=>{
 let command,params;
 const fake={async query(q,p){command=q;params=p;return{rowCount:1,rows:[]}},async end(){}};
 const store=new PostgresStore(fake),accepted=await store.insert(fixtureRun(15));
 assert.equal(accepted,true);assert.ok(command.includes('ON CONFLICT'));assert.ok(command.includes('VALUES($1,$2,$3,$4,$5,$6)'));
 assert.equal(params[0],'run-15');assert.equal(params[1],'svc-15');
});
test('PostgreSQL adapter list uses a bounded parameter',async()=>{
 let args;const fake={async query(q,p){args=p;return{rows:[{id:'run-1'}]}}};
 const result=await new PostgresStore(fake).list(7);assert.deepEqual(args,[7]);assert.equal(result.length,1);
});
