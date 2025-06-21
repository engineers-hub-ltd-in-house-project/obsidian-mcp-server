# Obsidian MCP Server 使用例

## 基本的なワークフロー

### 1. 記事の作成と管理

```
Claude: "Obsidianについての技術記事を作成して"
→ MCPサーバーが構造化された記事を作成
→ Articles/Tech/2025-06-21-obsidian.md として保存
→ GitHubに自動コミット
```

### 2. Daily Noteワークフロー

```
Claude: "今日の会議メモをDaily Noteに追加"
→ Daily Notes/2025-06-21.md に追記
→ タイムスタンプ付きで記録
```

### 3. 週次レポート

```
Claude: "今週の週次レポートテンプレートを作成"
→ Weekly Reports/2025-W25.md を作成
→ テンプレートに沿った構造
```

## 高度な使用例

### ブログ記事の執筆フロー

1. **アイデア出し**
   ```
   "AIとナレッジマネジメントについての記事アイデアをDaily Noteに"
   ```

2. **記事作成**
   ```
   "そのアイデアを元に記事を作成して。カテゴリーはTech、タグは[AI, Knowledge-Management, Obsidian]で"
   ```

3. **レビューと更新**
   ```
   "作成した記事を読んで、結論部分を強化して更新"
   ```

4. **公開準備**
   ```
   "記事のdraftフラグをfalseに更新"
   ```

### プロジェクトドキュメント管理

```
"obsidian-mcp-serverプロジェクトのドキュメントを作成"
→ Projects/obsidian-mcp-server/README.md
→ アーキテクチャ、セットアップ、使用方法を含む
```

### 知識の体系化

```
"Obsidianに関する記事をすべて検索"
→ 関連記事のリスト表示

"検索結果を元にObsidianガイドのまとめ記事を作成"
→ References/obsidian-guide.md として保存
```

## フォルダ構造

```
ObsidianVault/
├── Articles/           # 執筆記事
│   ├── Tech/          # 技術記事
│   ├── Tutorial/      # チュートリアル
│   └── Review/        # レビュー
├── Daily Notes/       # 日々の記録
├── Weekly Reports/    # 週次レポート
├── Projects/          # プロジェクト文書
├── Ideas/            # アイデアメモ
├── References/       # 参考資料
└── Templates/        # カスタムテンプレート
```

## Git/GitHub連携

### 自動コミットメッセージ
- `Add note: [タイトル]` - 新規作成
- `Update note: [パス]` - 更新
- `Delete note: [パス]` - 削除
- `Add article: [タイトル]` - 記事作成
- `Update daily note: [日付]` - Daily Note更新

### ブランチ戦略（将来的な拡張）
- `main` - 公開済みコンテンツ
- `draft` - 下書き
- `ideas` - アイデア段階

## ベストプラクティス

1. **構造化を意識**
   - カテゴリーとタグを適切に設定
   - フロントマターでメタデータ管理

2. **定期的な整理**
   - 週次でDaily Notesをレビュー
   - 月次でアーカイブ整理

3. **バージョン管理の活用**
   - 重要な変更前にコミット
   - 意味のあるコミットメッセージ

## 次のステップ：自動化

将来的にn8nやZapierと連携して：
- GitHub → ブログプラットフォーム自動投稿
- Weekly Report → Slack/Discord通知
- 特定タグ → Twitter/X自動投稿