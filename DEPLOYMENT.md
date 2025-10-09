# 🚀 Automated Deployment Guide

This project includes automated deployment scripts to streamline the git workflow and eliminate the need for manual file approvals.

## 📋 Available Scripts

### 1. Basic Deployment (`deploy.sh` / `deploy.bat`)

**Linux/macOS:**
```bash
./deploy.sh
# or
npm run deploy
```

**Windows:**
```cmd
deploy.bat
# or
npm run deploy:win
```

**What it does:**
- Automatically adds all changes (`git add .`)
- Creates a commit with timestamp and feature description
- Pushes to the current branch
- Shows deployment status

### 2. Quick Deployment (`quick-deploy.sh`)

**Usage:**
```bash
./quick-deploy.sh [message]
# or
npm run quick [message]
```

**What it does:**
- Minimal output for fast execution
- Automatically adds all changes
- Creates commit with custom message or timestamp
- Pushes to current branch
- Perfect for quick fixes and small changes

**Examples:**
```bash
# Quick deploy with timestamp
./quick-deploy.sh

# Quick deploy with custom message
./quick-deploy.sh "Fix typo in README"
npm run quick "Update dependencies"
```

### 3. Advanced Deployment (`deploy-advanced.sh`)

**Usage:**
```bash
./deploy-advanced.sh [options]
```

**Options:**
- `-m, --message MESSAGE` - Custom commit message
- `-b, --branch BRANCH` - Deploy to specific branch
- `-f, --force` - Force push (use with caution)
- `-d, --dry-run` - Show what would be done without executing
- `-h, --help` - Show help

**Examples:**
```bash
# Basic auto-deploy
./deploy-advanced.sh

# Custom message
./deploy-advanced.sh -m "Fix critical bug in filtering"

# Deploy to develop branch
./deploy-advanced.sh -b develop

# Dry run to see what would happen
./deploy-advanced.sh -d

# Force push (use carefully)
./deploy-advanced.sh -f
```

## 🎯 Features

### ✅ What's Automated
- **File staging**: All changes are automatically added
- **Commit creation**: Timestamped commits with feature descriptions
- **Branch management**: Can deploy to any branch
- **Push operations**: Automatic push to remote repository
- **Error handling**: Scripts exit on errors with clear messages
- **Status reporting**: Colored output showing deployment progress

### 🔒 Safety Features
- **Dry run mode**: Test deployments without making changes
- **Git validation**: Checks if you're in a git repository
- **Change detection**: Only commits if there are actual changes
- **Force push protection**: Requires explicit flag for force pushes
- **Branch verification**: Shows current branch before deployment

## 📁 Files Created

- `deploy.sh` - Basic deployment script (Linux/macOS)
- `deploy.bat` - Basic deployment script (Windows)
- `deploy-advanced.sh` - Advanced deployment with options
- `quick-deploy.sh` - Quick deployment for fast changes
- `DEPLOYMENT.md` - This documentation

## 🎮 Quick Reference

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm run deploy` | Basic auto-deploy | Regular deployments |
| `npm run quick` | Quick deploy | Small fixes, typos |
| `npm run deploy:advanced` | Advanced deploy | Complex deployments |
| `npm run deploy:dry` | Dry run | Test before deploy |
| `npm run deploy:help` | Show help | Get help with options |

### 🚀 With Aliases (if configured)

| Alias | Command | Description |
|-------|---------|-------------|
| `qd "message"` | `./quick-deploy.sh "message"` | Quick deploy |
| `deploy` | `./deploy.sh` | Standard deploy |
| `deploy-adv -d` | `./deploy-advanced.sh -d` | Dry run |

## 🛠️ Setup

1. **Make scripts executable** (Linux/macOS):
   ```bash
   chmod +x deploy.sh deploy-advanced.sh quick-deploy.sh
   ```

2. **Optional: Add aliases** (Linux/macOS):
   ```bash
   # Add to your ~/.bashrc, ~/.zshrc, or ~/.profile
   source .deploy-aliases
   
   # Or manually add these aliases:
   alias qd='./quick-deploy.sh'
   alias deploy='./deploy.sh'
   alias deploy-adv='./deploy-advanced.sh'
   ```

3. **Test the scripts**:
   ```bash
   # Test basic deployment
   ./deploy-advanced.sh -d
   
   # Test with custom message
   ./deploy-advanced.sh -m "Test deployment" -d
   ```

## 🚨 Important Notes

- **Backup**: Always ensure your work is backed up before using force push
- **Branch protection**: Be careful when deploying to protected branches
- **Review changes**: Use dry-run mode to review changes before deployment
- **Custom messages**: Use descriptive commit messages for better tracking

## 🔧 Troubleshooting

### Script not executable
```bash
chmod +x deploy.sh deploy-advanced.sh
```

### Git authentication issues
Ensure your git credentials are configured:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Permission denied
On Windows, you might need to run as administrator or adjust execution policy.

## 📊 Example Output

```
🚀 Starting advanced deployment...
[INFO] 📋 Current branch: main
[INFO] 📁 Files to be committed:
M  src/components/AnswerTable.tsx
A  src/components/FilterBar.tsx
A  src/components/BulkActions.tsx
[INFO] 📁 Adding all changes...
[INFO] 💾 Committing changes...
[INFO] 📤 Pushing to remote repository...
[SUCCESS] ✅ Deployment completed successfully!
[SUCCESS] 🌐 Changes pushed to: origin/main
[SUCCESS] ⏰ Timestamp: 2024-01-15 14:30:25
```

---

**Happy deploying! 🎉**
