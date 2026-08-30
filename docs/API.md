# API demonstration

The persistence API runs on `http://localhost:8787` when you use `npm run dev` or `npm run start`.

```bash
# health
curl -s http://localhost:8787/api/health

# seed if the database is empty
npm run seed

# list leads
curl -s http://localhost:8787/api/leads | head -c 400

# add a company to the working queue
curl -s -X PATCH http://localhost:8787/api/leads/1/queue \
  -H 'Content-Type: application/json' \
  -d '{"inQueue": true}'

# import / upsert a batch
curl -s -X POST http://localhost:8787/api/leads/import \
  -H 'Content-Type: application/json' \
  -d '{"leads":[{"id":"demo-import","company":"Demo Co","website":"demo.example","industry":"Commercial Services","location":"Austin, United States","revenue":4000000,"employees":30,"contactName":"Ada Cole","contactTitle":"Owner","email":"ada@demo.example","phone":null,"lastUpdated":"2026-08-20","inQueue":false}]}'
```

Scoring is not an API concern in this MVP. The client applies the live ICP to whatever the API returns, which keeps ICP edits instantaneous and the score fully visible in the UI.
