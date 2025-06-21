# Obsidian MCP Server セットアップガイド

## Windows 11 + WSL2環境での完全セットアップ手順

### 前提条件
- Windows 11でObsidianが動作している
- WSL2 Ubuntu 24.04がインストールされている
- Node.js 18以上がWSL2にインストールされている

### 1. Obsidian側の設定

1. **Local REST APIプラグインのインストール**
   - Obsidianを開く
   - 設定 → コミュニティプラグイン → ブラウズ
   - "Local REST API"を検索してインストール
   - プラグインを有効化

2. **Local REST APIの設定**
   - 設定 → Local REST API
   - **Binding Host**: `127.0.0.1` → `0.0.0.0` に変更（重要！）
   - **Port**: `27124`（デフォルト）
   - **HTTPS**: 有効（デフォルト）
   - **Copy API Key**をクリックしてAPIキーをコピー

### 2. WSL2側の設定

1. **プロジェクトのクローン**
```bash
cd ~/
git clone https://github.com/your-org/obsidian-mcp-server.git
cd obsidian-mcp-server
```

2. **依存関係のインストール**
```bash
npm install
```

3. **環境変数の設定**
```bash
# Windows側のIPアドレスを確認
ip route | grep default | awk '{print $3}'
# 例: 172.24.80.1

# .envファイルを作成
cp .env.example .env
nano .env
```

`.env`ファイルの内容:
```env
# WSL2からWindows側のObsidianに接続
OBSIDIAN_API_URL=https://172.24.80.1:27124
OBSIDIAN_API_KEY=your-copied-api-key-here

# Windows側のVaultパスをWSL2形式で指定（オプション）
# VAULT_PATH=/mnt/c/Users/YourName/Documents/ObsidianVault

# Git自動同期（Vault内でGitを使用する場合）
GIT_AUTO_SYNC=false

# ログレベル
LOG_LEVEL=info
```

4. **接続テスト**
```bash
node test-connection.js
```

成功すると以下のような出力が表示されます：
```
🔧 Obsidian MCP Server Connection Test
=====================================
API URL: https://172.24.80.1:27124
API Key: ✓ Set

1️⃣ Testing basic connection...
✅ Successfully connected to Obsidian!
```

### 3. Claude Codeへの登録

```bash
claude mcp add obsidian "node $HOME/obsidian-mcp-server/src/index.js"
```

環境変数は`.env`ファイルから自動的に読み込まれます。

### 4. 動作確認

Claude Codeで以下のように使用できます：

```
"テストノートを作成して"
→ Obsidianに新しいノートが作成される

"今日のDaily Noteに会議メモを追加"
→ Daily Noteに内容が追記される

"プロジェクトに関するノートを検索"
→ 関連するノートのリストが表示される
```

## トラブルシューティング

### 接続できない場合

1. **Windows Defenderファイアウォール**
   - ポート27124の受信を許可
   - Node.jsのネットワークアクセスを許可

2. **IPアドレスの確認**
   ```bash
   # WSL2側で実行
   ip route | grep default | awk '{print $3}'
   
   # Windows側で実行（cmd）
   ipconfig
   # "vEthernet (WSL)" のIPv4アドレスを確認
   ```

3. **Obsidianの再起動**
   - Binding Hostを変更した後は、Obsidianを完全に再起動

4. **証明書エラー**
   - MCPサーバーは自己署名証明書を自動的に受け入れるため、通常は問題ありません

### ログの確認

```bash
# デバッグモードで実行
LOG_LEVEL=debug node src/index.js
```

## セキュリティに関する注意

- Binding Hostを`0.0.0.0`に設定すると、ネットワーク上の他のデバイスからもアクセス可能になります
- 自宅やプライベートネットワークでの使用を推奨します
- 公共のネットワークでは使用しないでください

## 次のステップ

- Vaultフォルダ内でGitリポジトリを初期化して、自動バックアップを有効化
- Daily Noteテンプレートのカスタマイズ
- 独自のワークフローに合わせたMCPツールの追加