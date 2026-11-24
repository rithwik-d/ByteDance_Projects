'use strict';
const{PostgresStore}=require('../src/postgres'),{fixtureRun}=require('../src/core');
(async()=>{const s=await PostgresStore.connect();let count=0;for(let i=0;i<8000;i++)if(await s.insert(fixtureRun(i)))count++;console.log(`Inserted ${count} new synthetic CI runs`);await s.close()})().catch(e=>{console.error(e);process.exitCode=1});
