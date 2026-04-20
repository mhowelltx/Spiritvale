#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# --- .env setup ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

# Load DATABASE_URL from .env so we can parse it
set -o allexport
source .env
set +o allexport

# --- Parse connection details from DATABASE_URL ---
# Expected format: postgresql://user:password@host:port/dbname
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')

# --- Check Postgres is reachable ---
echo "Checking Postgres connection at ${DB_HOST}:${DB_PORT}..."
if ! PGPASSWORD="$DB_PASS" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -q; then
  echo "Error: Cannot reach Postgres at ${DB_HOST}:${DB_PORT}."
  echo "Make sure your local Postgres server is running."
  exit 1
fi

# --- Create database if it doesn't exist ---
DB_EXISTS=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" 2>/dev/null || true)
if [ "$DB_EXISTS" != "1" ]; then
  echo "Creating database '${DB_NAME}'..."
  PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
fi

# --- Install dependencies ---
echo "Installing dependencies..."
npm install

# --- Apply migrations ---
echo "Applying Prisma migrations..."
npx prisma migrate deploy

# --- Start dev server ---
echo "Starting Next.js dev server at http://localhost:3000"
npm run dev
