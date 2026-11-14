#!/usr/bin/env bash
# Isolated PostgreSQL 17 test runner for capital_ai_backup_reader (Issue #664)
# Usage: ./scripts/platform/backup-reader-isolated-test.sh
# Requires: docker

set -Eeuo pipefail

IMAGE="capital-ai-pg17-backup-test"
CONTAINER="pg17-backup-test-$$"

echo "=== Building isolated PostgreSQL 17 fixture ==="
docker build -t "$IMAGE" -f .github/docker/pg17-reader.Dockerfile .

echo "=== Starting temporary container ==="
docker run -d --name "$CONTAINER" \
  --network none \
  --tmpfs /var/lib/postgresql/data:rw,size=512m \
  -e POSTGRES_PASSWORD=test \
  "$IMAGE"

# Wait for PostgreSQL to be ready
for i in {1..30}; do
  if docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "=== Creating test schemas and sample data ==="
docker exec -i "$CONTAINER" psql -U postgres <<'SQL'
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE private.dashboard_notes (
  id serial PRIMARY KEY,
  user_id text,
  notes text
);
INSERT INTO private.dashboard_notes (user_id, notes) VALUES ('user1', 'test note');
SQL

echo "=== Running inventory ==="
docker exec -i "$CONTAINER" psql -U postgres -f - < scripts/platform/backup-reader-inventory.sql || true

echo "=== Creating backup reader role (isolated only) ==="
docker exec -i "$CONTAINER" psql -U postgres -f - < scripts/platform/backup-reader-role-draft.sql

echo "=== Running negative tests (expect failures) ==="
docker exec -i "$CONTAINER" psql -U capital_ai_backup_reader -f - < scripts/platform/backup-reader-negative-tests.sql || true

echo "=== Cleaning up ==="
docker rm -f "$CONTAINER" >/dev/null

echo "=== Isolated test run complete ==="
echo "Review the output above. All negative tests must have failed."
