#!/bin/bash

# Obsidian Vault Git セットアップスクリプト
# Windows側のVaultフォルダで実行してください

echo "🔧 Obsidian Vault Git Setup"
echo "=========================="

# Vaultパスを取得
read -p "Enter your Obsidian vault path (e.g., C:/Users/YourName/Documents/ObsidianVault): " VAULT_PATH

# WSL2形式に変換
WSL_VAULT_PATH=$(echo $VAULT_PATH | sed 's|C:|/mnt/c|' | sed 's|\\|/|g')
echo "WSL path: $WSL_VAULT_PATH"

# Gitリポジトリを初期化
cd "$WSL_VAULT_PATH"

if [ -d ".git" ]; then
    echo "⚠️  Git repository already exists!"
else
    git init
    echo "✅ Git repository initialized"
fi

# .gitignoreを作成
cat > .gitignore << 'EOF'
# Obsidian
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/app.json
.obsidian/appearance.json
.obsidian/core-plugins.json
.obsidian/core-plugins-migration.json
.obsidian/community-plugins.json
.obsidian/graph.json
.obsidian/page-preview.json
.obsidian/daily-notes.json
.obsidian/templates.json
.obsidian/hotkeys.json
.obsidian/command-palette.json

# Obsidian plugins data
.obsidian/plugins/*/data.json
.obsidian/plugins/*/main.js
.obsidian/plugins/*/styles.css
.obsidian/plugins/*/manifest.json

# Keep plugin configurations
!.obsidian/plugins/*/config.json

# System files
.DS_Store
Thumbs.db
*.swp
*~

# Temporary files
.tmp/
.temp/

# Private notes (オプション)
Private/
_drafts/
EOF

echo "✅ .gitignore created"

# READMEを作成
cat > README.md << 'EOF'
# My Obsidian Knowledge Base

This is my personal knowledge management system powered by Obsidian and AI.

## Structure

- `Daily Notes/` - 日々の記録とメモ
- `Articles/` - 執筆した記事
- `Ideas/` - アイデアとブレインストーミング
- `Projects/` - プロジェクト関連ドキュメント
- `References/` - 参考資料とリンク

## Workflow

1. Claude Code (AI) → Obsidian (作成・編集)
2. Obsidian → Git (自動バックアップ)
3. Git → GitHub (バージョン管理)

## Setup

This vault is automatically synced using the Obsidian MCP Server.
EOF

echo "✅ README.md created"

# 初回コミット
git add .
git commit -m "Initial commit: Obsidian vault setup"

echo ""
echo "📌 Next steps:"
echo "1. Create a new repository on GitHub"
echo "2. Run: git remote add origin https://github.com/username/my-obsidian-vault.git"
echo "3. Run: git push -u origin main"
echo ""
echo "4. Update your .env file in obsidian-mcp-server:"
echo "   VAULT_PATH=$WSL_VAULT_PATH"
echo "   GIT_AUTO_SYNC=true"