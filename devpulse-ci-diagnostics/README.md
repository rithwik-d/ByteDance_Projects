# DevPulse — CI Diagnostics & Test-Impact Explorer
Independent educational platform prototype for build-run analysis and developer-test selection. NOT ByteDance software.

**Stack:** Node.js, JavaScript, PostgreSQL/SQL, HTML/CSS, GitHub Actions.

## Quick start (no external database required)
```bash
node src/server.js
npm test
npm run benchmark
```
Open http://127.0.0.1:8083. This mode seeds 8,000 synthetic runs in memory.

## PostgreSQL mode
Requires a local Docker daemon and network access for npm dependency installation; not exercised in the supplied offline environment.
```bash
docker compose up -d
npm install
export DATABASE_URL=postgresql://devpulse:devpulse_dev_only@127.0.0.1:5432/devpulse
export STORAGE=postgres
npm run seed
npm start
```
The SQL schema implements indexes and a service-health aggregation view. `pg` uses parameterized SQL. Use different credentials for real deployments.

## Core behavior
- Classifies compile, dependency, test, and timeout failure logs using deterministic text rules (not LLM inference).
- Maps 240 fictional test cases to 96 modules; returns tests affected by selected changes.
- Builds per-service failure summaries from run metadata and exposes a browser dashboard and HTTP endpoints.
- Avoids recording any private source code or production logs.

## Local validation
`npm test` uses Node's built-in test runner (requires no third-party modules). `npm run benchmark` reports synthetic fixture counts; this is not production or database throughput. PostgreSQL integration is implemented but requires external infrastructure and is not counted as a passed integration test.


## Verification note
12 Node.js tests passed; 8,000 synthetic CI runs across 24 mock services; PostgreSQL integration not tested live.
