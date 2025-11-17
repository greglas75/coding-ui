#!/bin/bash

# Quick deployment script - minimal output, fast execution
# Usage: ./quick-deploy.sh [message]

set -e

MESSAGE="${1:-Quick deploy: $(date '+%H:%M:%S')}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository"
    exit 1
fi

# Check if there are any changes
if git diff --quiet && git diff --cached --quiet; then
    echo "ℹ️  No changes to commit"
    exit 0
fi

# Quick deploy
git add . > /dev/null 2>&1
git commit -m "$MESSAGE" > /dev/null 2>&1
git push origin $(git branch --show-current) > /dev/null 2>&1

echo "✅ Deployed: $MESSAGE"
