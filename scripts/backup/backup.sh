#!/bin/bash

PROJECT_DIR="/Users/greglas/coding-ui"
BACKUP_DIR="$HOME/Desktop/BACKUPY"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M")
BACKUP_NAME="coding-ui_backup_$TIMESTAMP.zip"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

echo "🔄 Creating backup for coding-ui..."

zip -r "$BACKUP_DIR/$BACKUP_NAME" . \
  -x "node_modules/*" \
  -x "dist/*" \
  -x ".git/*" \
  -x ".vscode/*" \
  -x ".cursor/*" \
  -x "src.zip" \
  -x "src 2.zip" \
  -x "prompt-history" \
  -x "*.log" \
  -x ".DS_Store" \
  -x ".tmp/*" \
  -x ".vite/*" \
  -x ".vite-temp/*"

echo ""
echo "✅ Backup zapisany: $BACKUP_NAME"
echo "📁 Lokalizacja: $BACKUP_DIR"
echo ""

# Pokaż rozmiar
SIZE=$(du -sh "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
echo "💾 Rozmiar: $SIZE"

# Zostaw tylko 10 najnowszych backupów
ls -t "$BACKUP_DIR"/coding-ui_backup_*.zip | tail -n +11 | xargs -I {} rm {} 2>/dev/null
echo "🗑️  Stare backupy usunięte (zachowano 10 najnowszych)"
