#!/bin/sh
set -e

echo "⏳ Waiting for the database & applying migrations..."

# Retry migrate deploy until the database is reachable.
ATTEMPTS=0
until npx prisma migrate deploy; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 15 ]; then
    echo "❌ Database not reachable after $ATTEMPTS attempts. Exiting."
    exit 1
  fi
  echo "Database not ready yet (attempt $ATTEMPTS). Retrying in 3s..."
  sleep 3
done

# Optionally seed the database when RUN_SEED=true.
if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Running database seed..."
  npx prisma db seed || echo "⚠️  Seed skipped or already applied."
fi

echo "✅ Migrations complete. Starting server..."
exec "$@"
