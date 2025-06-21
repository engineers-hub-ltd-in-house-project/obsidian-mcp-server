// 構造化コンテンツ作成のための追加ツール

export const contentTemplates = {
  article: (title, category) => `---
title: ${title}
date: ${new Date().toISOString()}
category: ${category}
tags: []
draft: true
---

# ${title}

## 概要

## 本文

## まとめ

## 参考リンク
`,

  weeklyReport: (weekNumber) => `---
type: weekly-report
week: ${weekNumber}
year: ${new Date().getFullYear()}
date: ${new Date().toISOString()}
---

# Week ${weekNumber} Report - ${new Date().getFullYear()}

## 今週の成果

### 完了したタスク
- 

### 作成した記事
- 

### 学んだこと
- 

## 来週の計画

## 振り返り
`,

  projectDoc: (projectName) => `---
project: ${projectName}
type: documentation
created: ${new Date().toISOString()}
status: active
---

# ${projectName}

## 概要

## 目的

## 技術スタック

## アーキテクチャ

## セットアップ

## 使用方法

## 今後の計画
`
};

// フォルダ構造の推奨設定
export const folderStructure = {
  articles: 'Articles',
  dailyNotes: 'Daily Notes',
  weeklyReports: 'Weekly Reports',
  projects: 'Projects',
  ideas: 'Ideas',
  references: 'References',
  templates: 'Templates'
};

// メタデータ管理
export function generateFrontmatter(data) {
  const frontmatter = Object.entries(data)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.join(', ')}]`;
      }
      return `${key}: ${value}`;
    })
    .join('\n');
  
  return `---\n${frontmatter}\n---\n\n`;
}