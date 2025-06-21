# Slack MCP Server セットアップガイド（Claude Code）

このガイドでは、WSL2環境（Ubuntu）でClaude CodeからSlackを操作できるようにするMCP（Model Context Protocol）サーバーの設定手順を詳しく説明します。

## 目次
1. [前提条件](#前提条件)
2. [Slack Bot Tokenの取得](#slack-bot-tokenの取得)
3. [MCPサーバーのセットアップ](#mcpサーバーのセットアップ)
4. [トラブルシューティング](#トラブルシューティング)
5. [使用例](#使用例)

## 前提条件

- **Claude Code (CLI)** がインストール済み
- **Node.js/npm** が利用可能（nvmでインストールされたものでもOK）
- **Slack Workspace** の管理者権限またはApp作成権限
- **WSL2** 環境（Windows上でLinuxを使用している場合）

## Slack Bot Tokenの取得

### 1. Slack Appを作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」をクリック
3. 「From scratch」を選択
4. App名とWorkspaceを設定

### 2. OAuth & Permissionsの設定

1. 左側メニューから「OAuth & Permissions」を選択
2. 「Bot Token Scopes」セクションで以下のスコープを追加：
   - `channels:read` - チャンネル情報の読み取り
   - `channels:history` - チャンネルメッセージ履歴の読み取り
   - `chat:write` - メッセージの投稿
   - `users:read` - ユーザー情報の読み取り
   - `reactions:write` - リアクションの追加
   - `groups:read` - プライベートチャンネルの読み取り（必要な場合）

### 3. Appのインストールとトークン取得

1. 「Install to Workspace」をクリック
2. 権限を確認して許可
3. 「Bot User OAuth Token」（`xoxb-`で始まる）をコピー

### 4. 必要な情報の収集

- **Bot Token**: `xoxb-xxxx-xxxx-xxxx` 形式
- **Team ID**: ワークスペースのID（`T`で始まる）
- **Channel IDs**: アクセスを許可するチャンネルのID（`C`で始まる）

Team IDとChannel IDsは、Slackのウェブ版でチャンネルを開いた時のURLから確認できます：
```
https://app.slack.com/client/{TEAM_ID}/{CHANNEL_ID}
```

## MCPサーバーのセットアップ

### 1. 必要なパッケージのインストール

```bash
# グローバルにインストール（推奨）
npm install -g @modelcontextprotocol/server-slack
```

### 2. MCPサーバーの追加

**重要**: 以下のコマンドを正確に実行してください。特に`--`の位置が重要です。

```bash
claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-your-token-here \
  -e SLACK_TEAM_ID=T06EW1FJ9T6 \
  -e SLACK_CHANNEL_IDS=C07C9CMPX0V \
  -- npx -y @modelcontextprotocol/server-slack
```

**コマンドの構成要素の説明**:
- `claude mcp add slack`: `slack`という名前でMCPサーバーを追加
- `-e KEY=value`: 環境変数の設定（複数可）
- `--`: CLIオプションとコマンド引数の区切り文字（必須）
- `npx -y @modelcontextprotocol/server-slack`: 実行するコマンド

### 3. 設定の確認

```bash
# MCPサーバーリストを確認
claude mcp list

# 詳細設定を確認（環境変数が正しく設定されているか確認）
claude mcp get slack
```

### 4. Claude Codeの再起動

**重要**: MCPサーバーの設定変更は、Claude Codeを再起動しないと反映されません。

```bash
# 1. 現在のセッションを終了
/exit

# 2. 新しいセッションを開始
claude

# 3. MCPの状態を確認
/mcp
```

`✓ connected`と表示されれば成功です。

### 成功時の表示例

```
Manage MCP servers

❯ 1. slack  ✔ connected · Enter to view details
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. `spawn npx ENOENT`エラー

**症状**: 
```
Connection failed: Error: spawn npx @modelcontextprotocol/server-slack ENOENT
```

**原因**: 
- npxコマンドがPATHに含まれていない
- コマンドの形式が間違っている

**解決方法**:
1. npxの場所を確認：
   ```bash
   which npx
   ```
2. npmが正しくインストールされているか確認：
   ```bash
   npm --version
   ```
3. 必要に応じてnpmを再インストール

#### 2. 環境変数が正しく渡されない

**症状**: 
- MCPサーバーは起動するが、Slackに接続できない
- 認証エラーが発生する

**原因**: 
- 環境変数の指定方法が間違っている
- 古い形式のコマンドを使用している

**誤った例**:
```bash
# これは動作しません
claude mcp add slack "npx @modelcontextprotocol/server-slack" \
  -e SLACK_BOT_TOKEN="xoxb-xxx"
```

**正しい例**:
```bash
# 環境変数を先に、--の後にコマンドを記述
claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-xxx \
  -- npx -y @modelcontextprotocol/server-slack
```

#### 3. フルパスの問題

**症状**: 
```
spawn /full/path/to/node /full/path/to/server ENOENT
```

**原因**: 
- フルパスで指定すると、全体が1つのコマンドとして解釈される

**解決方法**:
- npxを使用してパッケージ名で指定する（推奨）
- グローバルインストールして直接実行する

#### 4. MCPサーバーが`failed`状態のまま

**症状**: 
- `/mcp`を実行しても「✘ failed」と表示される
- 再起動しても改善しない

**解決方法**:
1. エラーログを確認：
   ```bash
   # ログディレクトリを確認
   ls -la ~/.cache/claude-cli-nodejs/*/mcp-logs-slack/
   
   # 最新のログを表示
   tail -n 50 ~/.cache/claude-cli-nodejs/*/mcp-logs-slack/*.txt
   ```

2. 既存の設定を削除して再設定：
   ```bash
   claude mcp remove slack
   claude mcp add slack -e SLACK_BOT_TOKEN=xoxb-xxx \
     -e SLACK_TEAM_ID=Txxx \
     -e SLACK_CHANNEL_IDS=Cxxx \
     -- npx -y @modelcontextprotocol/server-slack
   ```

3. Claude Codeを必ず再起動：
   ```bash
   /exit
   claude
   ```

### デバッグモード

問題が解決しない場合は、デバッグモードで実行：

```bash
claude --debug
```

これにより、詳細なエラーログがインラインで表示されます。

## 使用例

MCPサーバーが正常に接続されたら、以下のような操作が可能になります：

### チャンネル一覧の取得
```
「Slackのチャンネル一覧を見せて」
```

### メッセージの投稿
```
「#generalチャンネルに'テストメッセージ'を投稿して」
```

### 最近のメッセージの取得
```
「#generalチャンネルの最近のメッセージを10件取得して」
```

### リアクションの追加
```
「最後のメッセージに👍のリアクションを追加して」
```

## まとめ

Slack MCPサーバーのセットアップで最も重要なポイント：

1. **環境変数の指定方法**: `-e KEY=value`形式で、`--`の前に配置
2. **コマンドの区切り**: `--`でCLIオプションとコマンドを明確に分離
3. **再起動の必要性**: 設定変更後は必ず`/exit`してから再起動
4. **デバッグ**: 問題が発生したらログを確認し、`--debug`モードを活用

これらの点に注意すれば、スムーズにセットアップできるはずです。