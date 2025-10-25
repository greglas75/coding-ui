#!/bin/bash

# AI Assistant System Installer for coding-ui
# Created: 2025-10-25

set -e  # Exit on error

echo "🚀 Installing AI Assistant System for coding-ui..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if coding-ui directory is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 /path/to/coding-ui${NC}"
    echo ""
    echo "Example:"
    echo "  $0 /Users/greglas/coding-ui"
    echo ""
    exit 1
fi

TARGET_DIR="$1"

# Verify target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}❌ Directory not found: $TARGET_DIR${NC}"
    echo ""
    echo "Please provide the correct path to your coding-ui project."
    exit 1
fi

echo -e "${GREEN}✓ Found target directory: $TARGET_DIR${NC}"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEMPLATE_DIR="$SCRIPT_DIR"

echo -e "${GREEN}✓ Template directory: $TEMPLATE_DIR${NC}"
echo ""

# Check if files already exist
if [ -d "$TARGET_DIR/.claude" ]; then
    echo -e "${YELLOW}⚠️  .claude directory already exists.${NC}"
    read -p "Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p "$TARGET_DIR/.claude"
mkdir -p "$TARGET_DIR/.github"
echo -e "${GREEN}✓ Directories created${NC}"

# Copy files
echo ""
echo "📄 Copying files..."

files=(
    ".claude/instructions.md"
    ".github/AI_CHECKLIST.md"
    "PROJECT_CONTEXT.md"
    "DEBUGGING_RULES.md"
    "DEBUGGING_LOG.md"
    "README.md"
)

for file in "${files[@]}"; do
    if [ -f "$TEMPLATE_DIR/$file" ]; then
        cp "$TEMPLATE_DIR/$file" "$TARGET_DIR/$file"
        echo -e "${GREEN}✓ Copied $file${NC}"
    else
        echo -e "${RED}✗ Not found: $file${NC}"
    fi
done

echo ""
echo "🔧 Setting up git ignore..."

# Add DEBUGGING_LOG.md to .gitignore if not already there
if [ -f "$TARGET_DIR/.gitignore" ]; then
    if ! grep -q "DEBUGGING_LOG.md" "$TARGET_DIR/.gitignore"; then
        echo "DEBUGGING_LOG.md" >> "$TARGET_DIR/.gitignore"
        echo -e "${GREEN}✓ Added DEBUGGING_LOG.md to .gitignore${NC}"
    else
        echo -e "${YELLOW}⚠️  DEBUGGING_LOG.md already in .gitignore${NC}"
    fi
else
    echo "DEBUGGING_LOG.md" > "$TARGET_DIR/.gitignore"
    echo -e "${GREEN}✓ Created .gitignore${NC}"
fi

echo ""
echo "✅ Installation complete!"
echo ""
echo "📋 Installed files:"
echo "  .claude/instructions.md       - Claude Code main instructions"
echo "  .github/AI_CHECKLIST.md       - Pre-commit checklist"
echo "  PROJECT_CONTEXT.md            - Project context & history"
echo "  DEBUGGING_RULES.md            - Debugging protocols"
echo "  DEBUGGING_LOG.md              - Debugging attempt log"
echo "  README.md                     - Usage guide"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Review PROJECT_CONTEXT.md and update if needed:"
echo "   ${YELLOW}nano $TARGET_DIR/PROJECT_CONTEXT.md${NC}"
echo ""
echo "2. Test with Claude Code:"
echo "   ${YELLOW}cd $TARGET_DIR${NC}"
echo "   ${YELLOW}claude-code \"help me with [task]\"${NC}"
echo ""
echo "3. Or use with Claude Chat:"
echo "   Say: ${YELLOW}\"Read PROJECT_CONTEXT.md from coding-ui and help me with [task]\"${NC}"
echo ""
echo "4. Optional: Commit to git:"
echo "   ${YELLOW}cd $TARGET_DIR${NC}"
echo "   ${YELLOW}git add .claude .github PROJECT_CONTEXT.md DEBUGGING_RULES.md README.md${NC}"
echo "   ${YELLOW}git commit -m \"[Setup] Add AI assistant system\"${NC}"
echo ""
echo "📖 For full documentation, read:"
echo "   ${YELLOW}cat $TARGET_DIR/README.md${NC}"
echo ""
echo "🎉 Happy coding!"
