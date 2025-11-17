#!/bin/bash

# Database Backup Script
# Creates full backup of Supabase database

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/supabase-backup-$TIMESTAMP.sql"

echo "🗄️ Creating Supabase database backup..."

# Create backups directory
mkdir -p $BACKUP_DIR

# Database connection from .env
DB_HOST="aws-0-eu-central-1.pooler.supabase.com"
DB_PORT="6543"
DB_USER="postgres.hoanegucluoshmpoxfnl"
DB_NAME="postgres"
DB_PASSWORD="Kodowanie2024!"

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
