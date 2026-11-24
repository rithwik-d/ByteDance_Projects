# QueueGuard — Reliable Job Event Processor
Independent educational backend project. No production or ByteDance affiliation.

**Tech:** Node.js/JavaScript, optional MongoDB document store, HTTP API, GitHub Actions.

## Run without MongoDB
```bash
node server.js
npm test
npm run benchmark
```
Dashboard: http://127.0.0.1:8092

## MongoDB-backed demo
The MongoDB driver adapter includes persistent unique event IDs, queued/processed/dead statuses, restart replay for queued events, and indexed audit-oriented documents. Requires Docker and dependency installation (not exercised in the offline test environment):
```bash
docker compose up -d
npm install
MONGODB_URI=mongodb://127.0.0.1:27017 node server-mongo.js
```
`test/mongo-journal.test.js` validates the Mongo adapter contract with a fake collection; it is NOT a live MongoDB integration test. The journaling demo is not a production-grade distributed queue; crash windows and multiple-worker coordination require additional design.

## Observability and validation
Synthetic workload of 10,000 event IDs plus 100 duplicate replays. Retry and failure behaviors are simulated deterministically, not measured from a distributed network. The queue includes bounded worker processing, backoff, deduplication, dead-letter routing, and `/api/metrics` endpoint.


## Verification note
7 Node.js tests passed; 10,000 synthetic event workload; MongoDB integration not tested live.
