@echo off
setlocal enabledelayedexpansion

REM Automated deployment script for coding-ui (Windows)
REM This script automatically commits and pushes all changes

echo 🚀 Starting automated deployment...

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Not in a git repository
    exit /b 1
)

REM Check if there are any changes
git diff --quiet
if errorlevel 0 (
    git diff --cached --quiet
    if errorlevel 0 (
        echo ℹ️  No changes to commit
        exit /b 0
    )
)

REM Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo 📋 Current branch: !CURRENT_BRANCH!

REM Add all changes
echo 📁 Adding all changes...
git add .

REM Create commit with timestamp
for /f "tokens=1-6 delims=/: " %%a in ('echo %date% %time%') do set TIMESTAMP=%%c-%%a-%%b %%d:%%e:%%f
set COMMIT_MESSAGE=Auto-deploy: !TIMESTAMP!

echo 💾 Committing changes...
git commit -m "!COMMIT_MESSAGE!

- Added FilterBar component with search and status filtering
- Added BulkActions component for bulk status updates  
- Added keyboard shortcuts (1=whitelist, 2=blacklist, 3=categorized)
- Updated AnswerTable with row selection and filtering
- Enhanced UI with Tailwind dark mode support
- Maintained realtime functionality"

REM Push to remote
echo 📤 Pushing to remote repository...
git push origin !CURRENT_BRANCH!

echo ✅ Deployment completed successfully!
echo 🌐 Changes pushed to: origin/!CURRENT_BRANCH!
echo ⏰ Timestamp: !TIMESTAMP!
