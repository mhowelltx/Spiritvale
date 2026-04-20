#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required for one-command local startup."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose plugin is required."
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

echo "Starting local Postgres container..."
docker compose up -d db

echo "Waiting for Postgres health check..."
for _ in {1..30}; do
  status="$(docker inspect --format='{{json .State.Health.Status}}' spiritvale-db 2>/dev/null || true)"
  if [ "$status" = '"healthy"' ]; then
    break
  fi
  sleep 1
done

if [ "$(docker inspect --format='{{json .State.Health.Status}}' spiritvale-db 2>/dev/null || true)" != '"healthy"' ]; then
  echo "Error: Postgres did not become healthy in time."
  exit 1
fi

echo "Installing dependencies (npm install)..."
npm install

echo "Applying Prisma migration..."
npx prisma migrate dev --name init --skip-seed

echo "Starting Next.js dev server..."
npm run dev
