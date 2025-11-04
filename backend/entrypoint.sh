#!/bin/bash
set -e

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
while ! nc -z db 3306; do
  sleep 1
done
echo "MySQL started"

echo "Make database migrations..."
python manage.py makemigrations

# Apply database migrations
echo "Applying database migrate..."
python manage.py migrate

# Collect static files (important for production)
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Run setup script to create superuser and initial data
if [ -f setup_project.py ]; then
  echo "Running setup script..."
  python setup_project.py
fi

# Start server with uvicorn
echo "Starting uvicorn server..."
exec uvicorn backend.asgi:application --host 0.0.0.0 --port 8000 --reload --log-level info
