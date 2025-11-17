#!/bin/bash

# Advanced automated deployment script for coding-ui
# Usage: ./deploy-advanced.sh [options]
# Options:
#   -m, --message MESSAGE    Custom commit message
#   -b, --branch BRANCH      Deploy to specific branch
#   -f, --force             Force push (use with caution)
#   -d, --dry-run           Show what would be done without executing
#   -h, --help              Show this help

set -e

# Default values
CUSTOM_MESSAGE=""
TARGET_BRANCH=""
FORCE_PUSH=false
DRY_RUN=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    echo "Advanced deployment script for coding-ui"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -m, --message MESSAGE    Custom commit message"
    echo "  -b, --branch BRANCH      Deploy to specific branch"
    echo "  -f, --force             Force push (use with caution)"
    echo "  -d, --dry-run           Show what would be done without executing"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0                      # Auto-deploy with default message"
    echo "  $0 -m \"Fix bug in filter\" # Deploy with custom message"
    echo "  $0 -b develop           # Deploy to develop branch"
    echo "  $0 -d                   # Dry run to see what would happen"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--message)
            CUSTOM_MESSAGE="$2"
            shift 2
            ;;
        -b|--branch)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        -f|--force)
            FORCE_PUSH=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

print_status "🚀 Starting advanced deployment..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ -n "$TARGET_BRANCH" ]]; then
    print_status "Switching to target branch: $TARGET_BRANCH"
    if [[ "$DRY_RUN" == false ]]; then
        git checkout "$TARGET_BRANCH" || git checkout -b "$TARGET_BRANCH"
    fi
    CURRENT_BRANCH="$TARGET_BRANCH"
fi

print_status "📋 Current branch: $CURRENT_BRANCH"

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    print_warning "No changes to commit"
    exit 0
fi

# Show what files will be committed
print_status "📁 Files to be committed:"
git status --porcelain

if [[ "$DRY_RUN" == true ]]; then
    print_warning "DRY RUN MODE - No changes will be made"
    print_status "Would add all changes and commit with message:"
    if [[ -n "$CUSTOM_MESSAGE" ]]; then
        echo "  $CUSTOM_MESSAGE"
    else
        echo "  Auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    fi
    print_status "Would push to: origin/$CURRENT_BRANCH"
    if [[ "$FORCE_PUSH" == true ]]; then
        print_warning "Would use force push!"
    fi
    exit 0
fi

# Add all changes
print_status "📁 Adding all changes..."
git add .

# Create commit message
if [[ -n "$CUSTOM_MESSAGE" ]]; then
    COMMIT_MESSAGE="$CUSTOM_MESSAGE"
else
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MESSAGE="Auto-deploy: $TIMESTAMP

- Automated deployment with advanced script
- All changes committed and pushed automatically"
fi

print_status "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Push to remote
print_status "📤 Pushing to remote repository..."
if [[ "$FORCE_PUSH" == true ]]; then
    print_warning "Using force push!"
    git push --force origin "$CURRENT_BRANCH"
else
    git push origin "$CURRENT_BRANCH"
fi

print_success "✅ Deployment completed successfully!"
print_success "🌐 Changes pushed to: origin/$CURRENT_BRANCH"
print_success "⏰ Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
