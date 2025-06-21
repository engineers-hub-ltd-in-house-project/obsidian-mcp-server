# Obsidian MCP Server

ObsidianをAIから操作するためのMCP (Model Context Protocol) サーバーです。
Obsidian Local REST APIを使用してノートの作成・更新・検索を行い、Git連携により自動的にバックアップを行います。

## 🚀 機能

- **ノート管理**
  - 新規ノートの作成
  - 既存ノートの読み取り・更新・削除
  - フォルダ内のノート一覧取得
  
- **Daily Note連携**
  - 今日のDaily Noteへの追記
  - タイムスタンプ付き記録
  
- **検索機能**
  - キーワードによるノート検索
  - 検索結果の件数制限
  
- **Git自動同期**
  - 変更時の自動コミット
  - GitHubへの自動プッシュ

- **構造化コンテンツ作成**
  - 記事作成（フロントマター付き）
  - テンプレートからの作成
  - カテゴリー・タグ管理

## 📋 前提条件

1. **Obsidian**
   - [Local REST API](https://github.com/coddingtonbear/obsidian-local-rest-api) プラグインがインストール・有効化されていること
   - APIキーが生成されていること

2. **Git** (自動同期を使用する場合)
   - Vaultディレクトリがgitリポジトリとして初期化されていること
   - リモートリポジトリが設定されていること

3. **Node.js**
   - バージョン18以上

## 🛠️ セットアップ

### 1. Obsidianの設定

1. Obsidianを開き、設定 → コミュニティプラグイン → ブラウズ
2. "Local REST API"を検索してインストール
3. プラグインを有効化
4. Local REST APIの設定を開き、"Copy API Key"でAPIキーをコピー

### 2. Vault のGit設定（オプション）

```bash
cd /path/to/your/vault
git init
git remote add origin https://github.com/username/obsidian-vault.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 3. MCPサーバーのインストール

```bash
# 依存関係のインストール
cd obsidian-mcp-server
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して、APIキーとVaultパスを設定
```

### 4. Claude Codeへの登録

#### Windows 11 + WSL2環境の場合

```bash
# WSL2内で実行
claude mcp add obsidian "node /home/yusuke/engineers-hub.ltd/in-house-project/obsidian-mcp-server/src/index.js" \
  -e OBSIDIAN_API_URL="https://172.24.80.1:27124" \
  -e OBSIDIAN_API_KEY="your-api-key" \
  -e VAULT_PATH="/mnt/c/Users/YourName/Documents/ObsidianVault" \
  -e GIT_AUTO_SYNC="false"
```

**重要な設定ポイント:**
- `OBSIDIAN_API_URL`: WSL2からWindows側のObsidianに接続するため、Windows側のIPアドレスを使用
  - IPアドレスは `ip route | grep default | awk '{print $3}'` で確認
- Obsidianの設定で **Binding Host** を `0.0.0.0` に変更（デフォルトは127.0.0.1）
- HTTPS自己署名証明書を使用しているため、MCPサーバーは証明書検証をスキップします

#### 通常のLinux/Mac環境の場合

```bash
claude mcp add obsidian "node /path/to/obsidian-mcp-server/src/index.js" \
  -e OBSIDIAN_API_KEY="your-api-key" \
  -e VAULT_PATH="/path/to/vault" \
  -e GIT_AUTO_SYNC="true"
```

## 🔧 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|------------|
| `OBSIDIAN_API_URL` | Obsidian Local REST APIのURL | `http://localhost:27123` |
| `OBSIDIAN_API_KEY` | ObsidianのAPIキー | (必須) |
| `VAULT_PATH` | ObsidianのVaultパス | (Git同期時は必須) |
| `GIT_AUTO_SYNC` | Git自動同期の有効/無効 | `false` |
| `LOG_LEVEL` | ログレベル | `info` |

## 📝 使用例

### Claude Codeでの使用例

**1. 新規ノート作成**
```
"プロジェクトの要件定義をObsidianに保存して"
```

**2. Daily Noteへの追記**
```
"今日の会議の議事録をDaily Noteに追加"
```

**3. ノート検索**
```
"Tech Guildに関するノートを検索して"
```

**4. 週次レポート作成**
```
"今週のDaily Notesから重要な項目をまとめて週次レポートを作成"
```

**5. 構造化記事の作成**
```
"Obsidianの使い方についての記事を作成。カテゴリーはTutorial、タグは[Obsidian, PKM]で"
```

## 🛡️ 利用可能なツール

### createNote
新しいノートを作成します。

**パラメータ:**
- `title` (必須): ノートのタイトル
- `content` (必須): ノートの内容（Markdown形式）
- `folder` (オプション): 保存先フォルダ（デフォルト: "Notes"）

### appendToDaily
今日のDaily Noteに内容を追記します。

**パラメータ:**
- `content` (必須): 追記する内容
- `timestamp` (オプション): タイムスタンプを付けるか（デフォルト: true）

### searchNotes
ノートを検索します。

**パラメータ:**
- `query` (必須): 検索クエリ
- `limit` (オプション): 最大結果数（デフォルト: 10）

### readNote
ノートの内容を読み取ります。

**パラメータ:**
- `path` (必須): ノートのパス

### updateNote
既存のノートを更新します。

**パラメータ:**
- `path` (必須): ノートのパス
- `content` (必須): 新しい内容

### deleteNote
ノートを削除します。

**パラメータ:**
- `path` (必須): ノートのパス

### listNotes
フォルダ内のノート一覧を取得します。

**パラメータ:**
- `folder` (オプション): フォルダパス（デフォルト: "/"）

### createArticle
構造化された記事を作成します。

**パラメータ:**
- `title` (必須): 記事タイトル
- `category` (必須): カテゴリー
- `content` (必須): 記事内容
- `tags` (オプション): タグの配列
- `draft` (オプション): 下書きフラグ（デフォルト: true）

### createFromTemplate
テンプレートからノートを作成します。

**パラメータ:**
- `templateType` (必須): テンプレートタイプ（article, weeklyReport, projectDoc）
- `title` (必須): タイトル
- `category` (オプション): カテゴリー（記事の場合）

## 🧪 開発

```bash
# 開発モード（ファイル変更監視）
npm run dev

# テスト実行
npm test

# 接続テスト
node test-connection.js
```

## 📄 ライセンス

MIT

## 🤝 貢献

プルリクエストを歓迎します！大きな変更の場合は、まずissueを作成して変更内容について議論してください。