#!/bin/bash

# Automated deployment script for coding-ui
# This script automatically commits and pushes all changes

set -e  # Exit on any error

echo "🚀 Starting automated deployment..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📋 Current branch: $CURRENT_BRANCH"

# Add all changes
echo "📁 Adding all changes..."
git add .

# Create commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
COMMIT_MESSAGE="Auto-deploy: $TIMESTAMP

- Added FilterBar component with search and status filtering
- Added BulkActions component for bulk status updates
- Added keyboard shortcuts (1=whitelist, 2=blacklist, 3=categorized)
- Updated AnswerTable with row selection and filtering
- Enhanced UI with Tailwind dark mode support
- Maintained realtime functionality"

echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Push to remote
echo "📤 Pushing to remote repository..."
git push origin "$CURRENT_BRANCH"

echo "✅ Deployment completed successfully!"
echo "🌐 Changes pushed to: origin/$CURRENT_BRANCH"
echo "⏰ Timestamp: $TIMESTAMP"
