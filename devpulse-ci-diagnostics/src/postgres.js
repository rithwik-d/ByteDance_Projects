'use strict';
// Optional production-like persistence: requires npm install, PostgreSQL and DATABASE_URL.
const {validateRun}=require('./core');
class PostgresStore {
 constructor(pool){this.pool=pool}
 static async connect(){
   let Pool;try{({Pool}=require('pg'))}catch{throw Error('Install dependencies with npm install to use PostgreSQL')}
   const pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
   await pool.query('SELECT 1');return new PostgresStore(pool);
 }
 async insert(record){
  const r=validateRun(record);
  const v=await this.pool.query(`INSERT INTO ci_runs(id,service,status,duration_ms,log,failure_type)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,[r.id,r.service,r.status,r.duration_ms,r.log,r.failure_type]);
  return v.rowCount===1;
 }
 async list(limit=100){const r=await this.pool.query('SELECT id,service,status,duration_ms,log,failure_type FROM ci_runs ORDER BY created_at DESC,id DESC LIMIT $1',[limit]);return r.rows}
 async all(){const r=await this.pool.query('SELECT id,service,status,duration_ms,log,failure_type FROM ci_runs');return r.rows}
 async close(){await this.pool.end()}
}
module.exports={PostgresStore};
