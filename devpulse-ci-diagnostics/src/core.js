'use strict';
const FAILURES = ['compiler error', 'failed assertion', 'dependency unavailable', 'build timeout'];
const FLAGS = ['compile','test','dependency','timeout'];
function classifyLog(log = '') {
  const s=String(log).toLowerCase();
  if (s.includes('timeout') || s.includes('deadline exceeded')) return 'timeout';
  if (s.includes('assertion') || s.includes('test failed')) return 'test';
  if (s.includes('dependency') || s.includes('package not found')) return 'dependency';
  if (s.includes('compiler') || s.includes('syntax error')) return 'compile';
  return 'unknown';
}
function validateRun(r) {
  if (!r || !/^run-[\w-]{1,48}$/.test(r.id??'')) throw new Error('invalid run id');
  if (!/^svc-[0-9]{1,2}$/.test(r.service??'')) throw new Error('invalid service');
  if (!['passed','failed'].includes(r.status)) throw new Error('invalid status');
  if (!Number.isInteger(r.duration_ms)||r.duration_ms<0||r.duration_ms>3600000) throw new Error('invalid duration');
  if (typeof r.log !== 'string'||r.log.length>500) throw new Error('invalid log');
  return {...r, failure_type:r.status==='failed'?classifyLog(r.log):null};
}
function fixtureRun(i){
 const failed=i<616;return validateRun({id:`run-${i}`,service:`svc-${i%24}`,status:failed?'failed':'passed',duration_ms:80+(i*17)%900,log:failed?FAILURES[i%4]:''});
}
function fixtureTests(){
 return Array.from({length:240},(_,i)=>({name:`test-${i}`,modules:[`module-${i%96}`,`module-${(i*7+3)%96}`]}));
}
function impactedTests(changed, tests=fixtureTests()) {
 const changeSet=new Set(changed);if([...changeSet].some(n=>!/^module-\d{1,3}$/.test(n)))throw new Error('invalid module id');
 return tests.filter(t=>t.modules.some(m=>changeSet.has(m))).map(t=>t.name);
}
function summarize(runs){
 const byService={},byFailure={};let failed=0;
 for(const r of runs){const s=byService[r.service]??{total:0,failed:0};s.total++;if(r.status==='failed'){failed++;s.failed++;byFailure[r.failure_type??'unknown']=(byFailure[r.failure_type??'unknown']??0)+1;}byService[r.service]=s;}
 return{total:runs.length,failed,passed:runs.length-failed,byFailure,byService};
}
class MemoryStore {
 constructor(){this.records=new Map()}
 async insert(r){const parsed=validateRun(r);if(this.records.has(r.id))return false;this.records.set(r.id,parsed);return true}
 async list(limit=100){return [...this.records.values()].slice(-limit).reverse()}
 async all(){return [...this.records.values()]}
 async close(){}
}
module.exports={classifyLog,validateRun,fixtureRun,fixtureTests,impactedTests,summarize,MemoryStore,FLAGS};
