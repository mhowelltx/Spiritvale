# Spiritvale

Milestone 1 deployable-first implementation slice.

## Local run
1. Install dependencies.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run Prisma migration.
4. Start Next.js app.

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

## Available endpoints
- `GET /api/health`
- `POST /api/game/new`
- `GET /api/game/:villageId`
- `POST /api/game/:villageId/tick`
