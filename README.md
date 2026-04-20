# Spiritvale

Milestone 1 deployable-first implementation slice.

## One-command local startup (recommended)

```bash
npm run local:up
```

This command will:
1. create `.env` from `.env.example` if missing,
2. start PostgreSQL via Docker Compose,
3. wait for DB health,
4. install dependencies,
5. run Prisma migrations,
6. start Next.js in dev mode.

## Manual local run
1. Install dependencies.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Run Prisma migration.
4. Start Next.js app.

```bash
npm install
cp .env.example .env
docker compose up -d db
npx prisma migrate dev --name init
npm run dev
```

Open `http://localhost:3000`.

## Available endpoints
- `GET /api/health`
- `POST /api/game/new`
- `GET /api/game/:villageId`
- `POST /api/game/:villageId/tick`
