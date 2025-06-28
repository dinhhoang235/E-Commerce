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

# Run setup script to create superuser and initial data
if [ -f setup_project.py ]; then
  echo "Running setup script..."
  python setup_project.py
fi

# Start server
echo "Starting server..."
exec python manage.py runserver 0.0.0.0:8000
