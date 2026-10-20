# Dorm & Desk Tracker

A private, single-owner deal tracker for Canadian retailers: a deals feed, best price across stores, price history, in-store pickup stock and phone alerts.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values; never commit this file
npm run dev
```

Tests: `npm test` · Types: `npm run typecheck` · Lint: `npm run lint`

Personal data (watchlist, targets, pickup stores) lives only in the database and in the git-ignored `seed.local.json`. Never commit it.
