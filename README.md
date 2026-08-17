# Jiffit Backend

Production API for Jiffit (customers, heroes, operations dashboard).

## Stack

Node.js · TypeScript · Express 5 · Prisma · MySQL · Socket.IO

## Docs

Start at [docs/00-index.md](./docs/00-index.md). Living status: [docs/PROGRESS.md](./docs/PROGRESS.md).

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Health: `GET /health`

API: `/api/v1`

## Git remote

`https://github.com/HermannJafri/jiffit-backend.git` only. Never GitLab.
