#!/bin/sh
# Run migrations for Railway deployment.
# If prisma migrate deploy finds a failed migration (P3009), reset the schema
# and re-apply all migrations from scratch. This is safe because Railway has
# no production data worth preserving.
if ! npx prisma migrate deploy; then
  echo "Migration deploy failed — resetting schema and reapplying all migrations..."
  npx prisma migrate reset --force
fi
