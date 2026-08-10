#!/bin/bash
set -e

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z db 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
alembic upgrade head

echo "Starting uvicorn..."
uvicorn app.main:app --host 0.0.0.0 --port 8000