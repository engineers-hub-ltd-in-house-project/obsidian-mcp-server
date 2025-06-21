# Obsidian REST APIを使った記事投稿方法

## 概要
Obsidian Local REST APIを使用して、コマンドラインから直接Obsidianに記事を投稿する方法です。

## 前提条件
- Obsidian Local REST APIプラグインが有効化されていること
- APIキーが生成されていること
- WSL2の場合、Binding Hostが`0.0.0.0`に設定されていること

## 基本的な投稿コマンド

### cURLを使った投稿

```bash
curl -k -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @your-article.md \
  "https://YOUR_OBSIDIAN_IP:27124/vault/path/to/note.md"
```

### パラメータ説明
- `-k`: 自己署名証明書を許可（HTTPSの場合）
- `-X PUT`: HTTPメソッド（ノートの作成/更新）
- `-H "Authorization: Bearer YOUR_API_KEY"`: API認証
- `-H "Content-Type: text/markdown"`: コンテンツタイプ
- `--data-binary @your-article.md`: ファイルから内容を読み込み
- URL末尾: Vault内のパス（URLエンコードが必要な場合あり）

## 実際の使用例

### 1. 記事をArticlesフォルダに投稿

```bash
# 記事ファイルを作成
cat > my-article.md << 'EOF'
# 記事タイトル

記事の内容...
EOF

# Obsidianに投稿
curl -k -X PUT \
  -H "Authorization: Bearer 3d3742ca88c984cd54f9fc6ebe7e7c52822ea2a747411348a514bd8490753b64" \
  -H "Content-Type: text/markdown" \
  --data-binary @my-article.md \
  "https://172.24.80.1:27124/vault/Articles/Tech/my-article.md"
```

### 2. Daily Noteに追記

```bash
# 今日の日付を取得
TODAY=$(date +%Y-%m-%d)

# 現在の内容を取得
curl -k -X GET \
  -H "Authorization: Bearer YOUR_API_KEY" \
  "https://172.24.80.1:27124/vault/Daily%20Notes/${TODAY}.md" \
  -o daily-note.md

# 追記する内容を追加
echo -e "\n\n## $(date +%H:%M)\n新しい内容" >> daily-note.md

# 更新した内容を投稿
curl -k -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @daily-note.md \
  "https://172.24.80.1:27124/vault/Daily%20Notes/${TODAY}.md"
```

### 3. テンプレートから記事を作成

```bash
# テンプレートを使って記事を生成
cat > article.md << EOF
---
title: "Obsidian MCP Server Setup Guide"
date: $(date --iso-8601=seconds)
category: Tech
tags: [Obsidian, MCP, API]
draft: false
---

# Obsidian MCP Server Setup Guide

記事の内容...
EOF

# 投稿
curl -k -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @article.md \
  "https://172.24.80.1:27124/vault/Articles/Tech/$(date +%Y-%m-%d)-obsidian-mcp-setup.md"
```

## Node.jsスクリプトでの投稿

```javascript
import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs/promises';

// HTTPS自己署名証明書を無視
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function postToObsidian(path, content) {
  const response = await fetch(`https://172.24.80.1:27124/vault/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'text/markdown'
    },
    body: content,
    agent: httpsAgent
  });

  if (!response.ok) {
    throw new Error(`Failed to post: ${response.status}`);
  }
  
  console.log(`Successfully posted to: ${path}`);
}

// 使用例
const content = await fs.readFile('article.md', 'utf-8');
await postToObsidian('Articles/Tech/my-article.md', content);
```

## 環境変数を使った安全な方法

```bash
# .envファイルに設定を保存
echo "OBSIDIAN_API_KEY=your-api-key" > .env
echo "OBSIDIAN_API_URL=https://172.24.80.1:27124" >> .env

# スクリプトで使用
source .env
curl -k -X PUT \
  -H "Authorization: Bearer ${OBSIDIAN_API_KEY}" \
  -H "Content-Type: text/markdown" \
  --data-binary @article.md \
  "${OBSIDIAN_API_URL}/vault/Articles/article.md"
```

## URLエンコーディングの注意点

スペースを含むパスの場合：
```bash
# スペースは%20にエンコード
curl -k -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @note.md \
  "https://172.24.80.1:27124/vault/Daily%20Notes/2024-01-01.md"
```

## エラーハンドリング

```bash
# レスポンスを確認
RESPONSE=$(curl -k -s -w "\n%{http_code}" -X PUT \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: text/markdown" \
  --data-binary @article.md \
  "https://172.24.80.1:27124/vault/Articles/article.md")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  echo "Success!"
else
  echo "Error: HTTP $HTTP_CODE"
  echo "Response: $BODY"
fi
```

## まとめ

Obsidian Local REST APIを使用することで、コマンドラインやスクリプトから直接Obsidianにコンテンツを投稿できます。これにより、自動化やCIパイプラインとの統合が可能になります。