#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
poetry run alembic upgrade head

echo "Starting uvicorn..."
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload