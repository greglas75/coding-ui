#!/bin/bash

# Database Backup Script
# Creates full backup of Supabase database

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supabase-backup-$TIMESTAMP.sql"

echo "🗄️ Creating Supabase database backup..."

# Create backups directory
mkdir -p $BACKUP_DIR

# Load database credentials from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Database connection from environment variables
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD}"

# Validate required environment variables
if [ -z "$DB_PASSWORD" ]; then
  echo "❌ Error: SUPABASE_DB_PASSWORD not set in .env file"
  echo "Please add database credentials to .env:"
  echo "  SUPABASE_DB_HOST=your-host"
  echo "  SUPABASE_DB_PORT=6543"
  echo "  SUPABASE_DB_USER=your-user"
  echo "  SUPABASE_DB_NAME=postgres"
  echo "  SUPABASE_DB_PASSWORD=your-password"
  exit 1
fi

# Method 1: Using pg_dump (recommended)
echo "Attempting pg_dump..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h $DB_HOST \
  -p $DB_PORT \
  -U $DB_USER \
  -d $DB_NAME \
  --schema=public \
  --no-owner \
  --no-acl \
  > $BACKUP_FILE 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Database backup created: $BACKUP_FILE"
  ls -lh $BACKUP_FILE
  exit 0
fi

# Method 2: Using Supabase CLI
echo "Attempting supabase CLI..."
supabase db dump --db-url "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME" > $BACKUP_FILE 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Database backup created: $BACKUP_FILE"
  ls -lh $BACKUP_FILE
  exit 0
fi

echo "❌ Backup failed. Please install pg_dump or supabase CLI:"
echo "  brew install postgresql@15"
echo "  brew install supabase/tap/supabase"
exit 1
