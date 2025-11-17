#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🔄 Update Table Names to coui_ Prefix
# ═══════════════════════════════════════════════════════════════
# Purpose: Automatically replace table names in TypeScript/TSX files
# Usage: ./update-table-names-to-coui.sh
#
# ⚠️  BEFORE RUNNING:
# 1. Commit all changes: git add . && git commit -m "before table rename"
# 2. Create backup: cp -r src src.backup
# 3. Run this script
# 4. Review changes: git diff
# 5. Test: npm run dev
# ═══════════════════════════════════════════════════════════════

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${BLUE}🔄 Update Table Names to coui_ Prefix${NC}"
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

# Check if git repo
check_git_status() {
    print_info "Checking git status..."

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not a git repository!"
        echo ""
        echo "Initialize git first:"
        echo "  git init"
        echo "  git add ."
        echo "  git commit -m 'initial commit'"
        exit 1
    fi

    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes!"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Commit changes first:"
            echo "  git add ."
            echo "  git commit -m 'before table rename'"
            exit 1
        fi
    else
        print_success "Git status clean"
    fi
}

# Count occurrences before replacement
count_occurrences() {
    print_info "Counting current occurrences..."
    echo ""

    local total=0

    echo "Old table names:"
    for table in "answers" "categories" "codes" "codes_categories" "answer_codes" "file_imports"; do
        local count=$(grep -r "\.from('$table')" src/ 2>/dev/null | wc -l | tr -d ' ')
        total=$((total + count))
        echo "  .from('$table'): $count"
    done

    echo ""
    echo "Total occurrences to replace: $total"
    echo ""

    if [ $total -eq 0 ]; then
        print_warning "No occurrences found! Already migrated or no src/ folder?"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Perform replacement
do_replacement() {
    print_info "Starting replacement..."
    echo ""

    local files_changed=0

    # Find all .ts and .tsx files
    while IFS= read -r file; do
        local changed=false

        # Check if file contains old table names
        if grep -q "\.from('answers')\|\.from('categories')\|\.from('codes')\|\.from('codes_categories')\|\.from('answer_codes')\|\.from('file_imports')" "$file"; then
            print_info "Processing: $file"

            # macOS sed syntax (with backup)
            sed -i '.bak' \
                -e "s/\.from('answers')/\.from('coui_answers')/g" \
                -e "s/\.from('categories')/\.from('coui_categories')/g" \
                -e "s/\.from('codes_categories')/\.from('coui_codes_categories')/g" \
                -e "s/\.from('codes')/\.from('coui_codes')/g" \
                -e "s/\.from('answer_codes')/\.from('coui_answer_codes')/g" \
                -e "s/\.from('file_imports')/\.from('coui_file_imports')/g" \
                "$file"

            # Also replace RPC function calls
            sed -i '.bak' \
                -e "s/\.rpc('get_high_confidence_suggestions'/\.rpc('coui_get_high_confidence_suggestions'/g" \
                -e "s/\.rpc('get_ai_suggestion_accuracy'/\.rpc('coui_get_ai_suggestion_accuracy'/g" \
                -e "s/\.rpc('get_top_ai_suggested_codes'/\.rpc('coui_get_top_ai_suggested_codes'/g" \
                -e "s/\.rpc('get_import_stats'/\.rpc('coui_get_import_stats'/g" \
                -e "s/\.rpc('get_recent_imports'/\.rpc('coui_get_recent_imports'/g" \
                -e "s/\.rpc('assign_whitelisted_code'/\.rpc('coui_assign_whitelisted_code'/g" \
                "$file"

            files_changed=$((files_changed + 1))
        fi
    done < <(find src -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)

    print_success "Processed $files_changed file(s)"
    echo ""
}

# Cleanup backup files
cleanup_backups() {
    print_info "Cleaning up backup files (.bak)..."

    find src -type f -name "*.bak" -delete 2>/dev/null

    print_success "Cleanup complete"
    echo ""
}

# Verify changes
verify_changes() {
    print_info "Verifying changes..."
    echo ""

    echo "New table names (coui_ prefix):"
    for table in "coui_answers" "coui_categories" "coui_codes" "coui_codes_categories" "coui_answer_codes" "coui_file_imports"; do
        local count=$(grep -r "\.from('$table')" src/ 2>/dev/null | wc -l | tr -d ' ')
        echo "  .from('$table'): $count"
    done

    echo ""

    echo "Old table names (should be 0):"
    local remaining=0
    for table in "answers" "categories" "codes" "codes_categories" "answer_codes" "file_imports"; do
        local count=$(grep -r "\.from('$table')" src/ 2>/dev/null | wc -l | tr -d ' ')
        remaining=$((remaining + count))
        if [ $count -gt 0 ]; then
            echo -e "  ${RED}.from('$table'): $count ❌${NC}"
        else
            echo -e "  ${GREEN}.from('$table'): $count ✓${NC}"
        fi
    done

    echo ""

    if [ $remaining -gt 0 ]; then
        print_warning "$remaining old table name(s) still found!"
        echo ""
        echo "Check these files:"
        grep -r "\.from('answers')\|\.from('categories')\|\.from('codes')\|\.from('codes_categories')\|\.from('answer_codes')\|\.from('file_imports')" src/ 2>/dev/null | cut -d: -f1 | sort -u
        echo ""
    else
        print_success "All table names successfully updated!"
    fi
}

# Show summary
show_summary() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    print_success "Table Name Update Complete! 🎉"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📋 Next steps:"
    echo ""
    echo "1. Review changes:"
    echo "   git diff"
    echo ""
    echo "2. Check for any issues:"
    echo "   npm run type-check"
    echo "   npm run lint"
    echo ""
    echo "3. Test application:"
    echo "   npm run dev"
    echo "   # Open http://localhost:5173 and test features"
    echo ""
    echo "4. If everything works:"
    echo "   git add ."
    echo "   git commit -m 'feat: migrate table names to coui_ prefix'"
    echo ""
    echo "5. If something went wrong:"
    echo "   git reset --hard HEAD  # Revert all changes"
    echo "   # Or restore from backup:"
    echo "   rm -rf src && mv src.backup src"
    echo ""
    echo "📖 See MIGRACJA_Z_PREFIKSEM_COUI.md for more details"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
}

# Main execution
main() {
    print_header

    # Pre-checks
    check_git_status
    count_occurrences

    # Confirm before proceeding
    print_warning "This will modify files in src/ directory!"
    echo ""
    read -p "Do you want to proceed? (y/n) " -n 1 -r
    echo
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Operation cancelled"
        exit 0
    fi

    # Perform replacement
    do_replacement

    # Cleanup
    cleanup_backups

    # Verify
    verify_changes

    # Summary
    show_summary
}

# Run main function
main


