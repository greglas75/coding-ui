#!/bin/bash

# ═══════════════════════════════════════════════════════════
# 💾 Backup Script dla Coding UI - Supabase Database
# ═══════════════════════════════════════════════════════════
# Usage: ./backup-supabase.sh
#
# Przed uruchomieniem:
# 1. chmod +x backup-supabase.sh
# 2. Edytuj poniższe zmienne (DB_PASSWORD, DB_HOST)
# 3. Uruchom: ./backup-supabase.sh
# ═══════════════════════════════════════════════════════════

# 🔐 CONFIGURATION - WPISZ SWOJE DANE TUTAJ
DB_PASSWORD="your_password_here"              # ⚠️ ZMIEŃ TO!
DB_HOST="db.abc123xyz456.supabase.co"         # ⚠️ ZMIEŃ TO!
DB_USER="postgres"                             # ✅ Zostaw postgres
DB_NAME="postgres"                             # ✅ Zostaw postgres
DB_PORT="5432"                                 # ✅ Zostaw 5432

# 📁 Backup configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_FOLDER=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DIR/$DATE_FOLDER/coding_ui_backup_$TIMESTAMP.sql"

# 🎨 Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════
# FUNCTIONS
# ═══════════════════════════════════════════════════════════

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${BLUE}💾 Supabase Database Backup${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."

    if ! command -v pg_dump &> /dev/null; then
        print_error "pg_dump not found!"
        echo ""
        echo "Install PostgreSQL client:"
        echo "  macOS:   brew install postgresql"
        echo "  Ubuntu:  sudo apt-get install postgresql-client"
        echo "  Windows: https://www.postgresql.org/download/windows/"
        exit 1
    fi

    print_success "pg_dump found ($(pg_dump --version | head -n1))"
}

check_configuration() {
    print_info "Checking configuration..."

    if [ "$DB_PASSWORD" == "your_password_here" ]; then
        print_error "Database password not configured!"
        echo ""
        echo "Edit this file and set DB_PASSWORD to your Supabase password:"
        echo "  nano backup-supabase.sh"
        echo ""
        echo "Find password in: Supabase Dashboard → Project Settings → Database"
        exit 1
    fi

    if [ "$DB_HOST" == "db.abc123xyz456.supabase.co" ]; then
        print_warning "Using default DB_HOST - make sure this is correct!"
        echo "  Find host in: Supabase Dashboard → Project Settings → Database"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    print_success "Configuration OK"
}

create_backup_dir() {
    print_info "Creating backup directory..."
    mkdir -p "$BACKUP_DIR/$DATE_FOLDER"
    print_success "Directory: $BACKUP_DIR/$DATE_FOLDER"
}

run_backup() {
    print_info "Starting backup..."
    echo "📅 Timestamp: $TIMESTAMP"
    echo "🗄️  Database: $DB_HOST"
    echo ""

    # Connection string
    CONN_STRING="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

    # Run pg_dump with verbose output
    print_info "Running pg_dump (this may take a few minutes)..."
    pg_dump --verbose "$CONN_STRING" > "$BACKUP_FILE" 2>&1

    # Check if backup was successful
    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
        print_success "Backup successful!"

        # Show file size
        FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "📊 Size: $FILE_SIZE"

        # Count tables
        TABLE_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE")
        echo "📋 Tables: $TABLE_COUNT"

        # Show tables
        echo "📦 Tables found:"
        grep "CREATE TABLE" "$BACKUP_FILE" | sed 's/CREATE TABLE /  - /' | sed 's/ (//'

        return 0
    else
        print_error "Backup failed!"
        if [ -f "$BACKUP_FILE" ]; then
            print_info "Partial file created, removing..."
            rm "$BACKUP_FILE"
        fi
        return 1
    fi
}

compress_backup() {
    print_info "Compressing backup..."

    gzip -f "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
        print_success "Compressed to: $COMPRESSED_SIZE"
        echo "📁 Final file: $BACKUP_FILE.gz"
        return 0
    else
        print_error "Compression failed!"
        return 1
    fi
}

cleanup_old_backups() {
    print_info "Cleaning old backups (keeping last 7 days)..."

    # Find and remove folders older than 7 days
    find "$BACKUP_DIR" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null

    REMAINING=$(find "$BACKUP_DIR" -type f -name "*.sql.gz" | wc -l | tr -d ' ')
    print_success "Kept $REMAINING backup(s)"
}

show_backup_info() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    print_success "Backup Complete! 🎉"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📁 Backup file:"
    echo "   $BACKUP_FILE.gz"
    echo ""
    echo "📊 Backup info:"
    ls -lh "$BACKUP_FILE.gz" | awk '{print "   Size: "$5"  Modified: "$6" "$7" "$8}'
    echo ""
    echo "🔐 Security reminders:"
    echo "   • DO NOT commit to Git!"
    echo "   • Store securely (cloud storage with encryption)"
    echo "   • Keep multiple backups in different locations"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Verify backup: gunzip -c '$BACKUP_FILE.gz' | head -n 50"
    echo "   2. Upload to secure storage (Google Drive, Dropbox, etc.)"
    echo "   3. Continue migration: see MIGRATION_CHECKLIST.md"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
}

# ═══════════════════════════════════════════════════════════
# MAIN SCRIPT
# ═══════════════════════════════════════════════════════════

main() {
    print_header

    # Checks
    check_dependencies
    check_configuration

    # Backup process
    create_backup_dir

    if run_backup; then
        compress_backup
        cleanup_old_backups
        show_backup_info
        exit 0
    else
        print_error "Backup process failed!"
        echo ""
        echo "🆘 Troubleshooting:"
        echo "   • Check database password (Supabase Dashboard → Settings → Database)"
        echo "   • Check database host is correct"
        echo "   • Check internet connection"
        echo "   • Check if Supabase project is not paused"
        echo "   • See: BACKUP_INSTRUKCJE.md for more help"
        echo ""
        exit 1
    fi
}

# Run main function
main


