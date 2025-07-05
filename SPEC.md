# NotionTaskBot システム仕様書

## 概要

Discord サーバーと Notion を連携し、AI を活用したタスク管理を行う Bot システム。Web 管理画面と Discord Bot の統合プラットフォーム。

### 主な特徴

- **マルチテナント SaaS 設計**: サーバーごとの独立した設定管理
- **AI 活用**: OpenAI によるタスク分析・アドバイス機能
- **Notion 連携**: リアルタイムタスク同期・管理
- **Web 管理画面**: 直感的な設定・管理インターフェース
- **Discord Bot**: スラッシュコマンドによるタスク操作

## システムアーキテクチャ

### 技術スタック

#### フロントエンド

- **Next.js 14.2.5** (App Router)
- **React 18.3.1** (Hooks, Suspense)
- **TypeScript 5.8.3** (型安全性)
- **Tailwind CSS 3.4.17** (スタイリング)
- **Lucide React 0.523.0** (アイコン)
- **Radix UI** (アクセシブルコンポーネント)

#### バックエンド

- **Next.js API Routes** (サーバーサイド)
- **Discord.js 14.19.3** (Bot 機能)
- **OpenAI API 5.5.0** (AI 機能)
- **Notion API 3.1.3** (タスク管理)

#### データベース・インフラ

- **Supabase** (PostgreSQL, 認証, RLS)
- **Render** (デプロイ・ホスティング)
- **Discord OAuth2** (認証)

#### 開発・運用

- **ESLint** (コード品質)
- **TypeScript** (型チェック)
- **Concurrently** (並行開発)
- **Nodemon** (Bot 開発)

### ディレクトリ構成

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API エンドポイント
│   │   ├── auth/                 # 認証関連
│   │   │   ├── login/           # Discord OAuth2 ログイン
│   │   │   └── callback/        # OAuth2 コールバック
│   │   ├── bot-callback/        # Bot 追加コールバック
│   │   ├── guilds/              # サーバー管理
│   │   ├── notion/              # Notion 連携
│   │   ├── discord/             # Discord API
│   │   ├── sessions/            # セッション管理
│   │   ├── health/              # ヘルスチェック
│   │   └── log-error/           # エラーログ
│   ├── auth/                     # 認証ページ
│   │   ├── login/               # ログインページ
│   │   └── callback/            # 認証コールバック
│   ├── dashboard/                # 管理ダッシュボード
│   │   ├── page.tsx             # サーバー一覧
│   │   ├── select-guild/        # サーバー選択
│   │   ├── bot-callback/        # Bot 追加フロー
│   │   └── [guildId]/           # サーバー個別管理
│   │       ├── page.tsx         # サーバーダッシュボード
│   │       ├── notion/          # Notion 設定
│   │       ├── commands/        # コマンド管理
│   │       └── tasks/           # タスク管理
│   ├── globals.css              # グローバルスタイル
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # ランディングページ
│   ├── loading.tsx              # ローディング画面
│   ├── error.tsx                # エラー画面
│   └── not-found.tsx            # 404 ページ
├── bot/                          # Discord Bot
│   ├── index.ts                 # Bot メイン処理
│   ├── prompts.ts               # AI プロンプト管理
│   └── prompts/                 # プロンプトファイル
├── components/                   # React コンポーネント
│   ├── ui/                      # 基本 UI コンポーネント
│   │   ├── button.tsx          # ボタン
│   │   ├── card.tsx            # カード
│   │   ├── input.tsx           # 入力フィールド
│   │   ├── alert.tsx           # アラート
│   │   ├── badge.tsx           # バッジ
│   │   ├── label.tsx           # ラベル
│   │   ├── select.tsx          # セレクト
│   │   └── loading-spinner.tsx # ローディング
│   └── dashboard/               # ダッシュボード専用
│       ├── GuildCard.tsx       # サーバーカード
│       └── GuildStatusBadge.tsx # ステータスバッジ
├── lib/                          # ユーティリティ・ライブラリ
│   ├── supabase.ts             # Supabase クライアント
│   ├── discord.ts              # Discord API クライアント
│   ├── notion.ts               # Notion API クライアント
│   ├── bot-api-client.ts       # Bot-Web API 通信
│   ├── error-handler.ts        # エラーハンドリング
│   ├── rate-limiter.ts         # レート制限
│   ├── utils.ts                # 汎用ユーティリティ
│   ├── setup-commands.ts       # コマンド設定
│   ├── environment-config.ts    # 環境設定
│   └── hooks/                  # カスタムフック
├── hooks/                        # React カスタムフック
│   ├── useCookie.ts            # クッキー管理
│   └── useDiscordGuilds.ts     # Discord サーバー取得
├── types/                        # TypeScript 型定義
│   └── guild.ts                # サーバー関連型
└── middleware.ts                # Next.js ミドルウェア
```

## データベース設計

### Supabase テーブル構造

#### `guilds` テーブル (メインテーブル)

```sql
CREATE TABLE guilds (
    guild_id VARCHAR(255) PRIMARY KEY,           -- Discord サーバーID
    guild_name VARCHAR(255) NOT NULL,            -- サーバー名
    bot_client_id VARCHAR(255),                  -- Bot クライアントID
    discord_user_id VARCHAR(255),                -- 設定者ユーザーID
    notion_api_key TEXT,                         -- Notion API キー
    notion_database_id VARCHAR(255),             -- Notion データベースID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)

- ユーザーは自分の設定したサーバーのみアクセス可能
- `discord_user_id` による認証・認可

### インデックス

- `guild_id` (PRIMARY KEY)
- `discord_user_id` (検索用)
- `created_at` (時系列検索用)

## 認証・セキュリティ

### Discord OAuth2 フロー

1. **ログイン**: `/auth/login` → Discord 認証画面
2. **コールバック**: `/api/auth/callback` → トークン取得・セッション作成
3. **セッション管理**: クッキーベース認証
4. **Bot 追加**: `/auth/callback` → `/dashboard/bot-callback`

### セキュリティ対策

- **環境変数管理**: 機密情報の外部化
- **CSRF 保護**: Next.js 組み込み機能
- **レート制限**: API 呼び出し制限
- **入力検証**: 型安全性・バリデーション
- **エラーハンドリング**: 詳細なエラー管理

## API エンドポイント

### 認証関連

- `GET /api/auth/login` - Discord OAuth2 URL 生成
- `GET /api/auth/callback` - OAuth2 コールバック処理
- `POST /api/sessions/logout` - ログアウト

### サーバー管理

- `GET /api/guilds` - サーバー一覧取得
- `GET /api/guilds/[guildId]` - サーバー詳細取得
- `POST /api/guilds` - サーバー設定保存 (upsert)
- `GET /api/guilds/bot-status` - Bot 状態確認
- `POST /api/guilds/bot-status` - Bot 状態更新

### Notion 連携

- `POST /api/notion/test` - 接続テスト
- `POST /api/notion/tasks` - タスク一覧取得
- `POST /api/notion/tasks/create` - タスク作成

### Bot 管理

- `POST /api/bot-callback` - Bot 追加コールバック
- `GET /api/discord/guilds` - Discord サーバー一覧
- `POST /api/discord/bot-invite` - Bot 招待 URL 生成

### システム

- `GET /api/health` - ヘルスチェック
- `POST /api/log-error` - エラーログ送信

## Discord Bot 機能

### コマンド一覧

#### 設定系

- `/setup` - Notion 設定ガイド
- `/config` - 現在の設定確認
- `/reset` - 設定リセット

#### タスク管理

- `/addtask` - タスク追加
  - `content` (必須): タスク内容
  - `assignee` (任意): 担当者名
  - `due` (任意): 期限 (YYYY-MM-DD)
- `/mytasks` - 担当者の未完了タスク
- `/duetasks` - 3 日以内の期限タスク
- `/overduetasks` - 期限切れタスク

#### 分析・アドバイス

- `/advise` - 担当者へのアドバイス
- `/weekprogress` - 今週作成タスク一覧
- `/weekadvise` - 今週期限タスクへのアドバイス
- `/projectadvice` - プロジェクト全体の分析

#### 情報表示

- `/listassignees` - 上位 10 名の担当者
- `/liststatus` - 上位 10 件のステータス

### AI 機能

- **OpenAI GPT-4** による分析
- **日本語プロンプト** による自然な応答
- **2000 文字制限** による適切な長さ調整
- **コンテキスト理解** による実用的なアドバイス

## Notion 連携機能

### データベース構造対応

- **柔軟なプロパティ対応**: 任意のプロパティ名に対応
- **自動プロパティ検出**: データベース構造の自動解析
- **推奨構造ガイド**: 最適な設定方法の案内

### タスク管理機能

- **タスク作成**: Discord から直接作成
- **タスク一覧**: フィルタリング・検索
- **タスク更新**: ステータス・優先度変更
- **期限管理**: 期限切れ・期限間近の通知

### プロパティ対応

- **Name**: タスクタイトル
- **Status**: ステータス (Select/Status)
- **Priority**: 優先度 (Select)
- **Assignee**: 担当者 (People)
- **Due Date**: 期限 (Date)
- **Description**: 説明 (Text/Rich Text)
- **Tags**: タグ (Multi-select)

## Web 管理画面

### ページ構成

#### ランディングページ (`/`)

- システム概要・機能紹介
- Discord ログインボタン
- 利用規約・プライバシーポリシー

#### 認証ページ

- `/auth/login` - Discord OAuth2 ログイン
- `/auth/callback` - 認証コールバック処理

#### ダッシュボード

- `/dashboard` - サーバー一覧・選択
- `/dashboard/select-guild` - サーバー選択画面
- `/dashboard/bot-callback` - Bot 追加フロー

#### サーバー管理 (`/dashboard/[guildId]`)

- **メインダッシュボード**: 概要・クイックアクション
- **Notion 設定**: API キー・データベース設定
- **コマンド管理**: コマンド一覧・説明
- **タスク管理**: タスク一覧・作成・編集

### UI/UX 設計

- **レスポンシブデザイン**: モバイル・デスクトップ対応
- **ダークモード対応**: ユーザー設定に応じた表示
- **アクセシビリティ**: WCAG 準拠
- **ローディング状態**: 適切なフィードバック
- **エラー処理**: 分かりやすいエラーメッセージ

## エラーハンドリング

### エラー分類

- **認証エラー**: OAuth2・セッション関連
- **API エラー**: Discord・Notion API 関連
- **ネットワークエラー**: 接続・タイムアウト
- **バリデーションエラー**: 入力データ検証
- **システムエラー**: 予期しないエラー

### エラー管理システム

- **構造化エラーログ**: 詳細なエラー情報
- **外部ログサービス**: 本番環境での監視
- **ユーザーフレンドリー**: 分かりやすいエラーメッセージ
- **リトライ機能**: 一時的なエラーの自動復旧

## 開発・運用

### 開発環境

```bash
# 開発サーバー起動
npm run dev          # Web アプリ (localhost:3000)
npm run bot:dev      # Bot 開発 (nodemon)
npm run dev:all      # 両方同時起動

# ビルド・デプロイ
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
npm run start:all    # Web + Bot 同時起動
```

### 環境変数

```env
# Discord
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token

# Notion
NOTION_API_KEY=your_notion_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# アプリケーション
NEXT_PUBLIC_APP_URL=http://localhost:3000
BOT_API_SECRET=your_secure_secret
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### デプロイ

- **Render**: Web アプリケーション
- **環境変数**: Render ダッシュボードで設定
- **自動デプロイ**: Git プッシュで自動更新
- **ヘルスチェック**: `/api/health` エンドポイント

### 監視・ログ

- **エラーログ**: 構造化ログ出力
- **パフォーマンス**: Next.js 組み込み監視
- **セキュリティ**: 不正アクセス検知
- **可用性**: ヘルスチェック・アラート

## 拡張性・保守性

### コード品質

- **TypeScript**: 型安全性の確保
- **ESLint**: コード品質チェック
- **Prettier**: コードフォーマット
- **Git Hooks**: コミット前チェック

### アーキテクチャ設計

- **モジュール化**: 機能別の分離
- **カスタムフック**: ロジックの再利用
- **エラーハンドリング**: 統一的な処理
- **型定義**: 厳密な型チェック

### 将来の拡張

- **プラグイン機能**: 新機能の追加
- **API 拡張**: 外部連携の追加
- **UI テーマ**: カスタマイズ可能なデザイン
- **多言語対応**: 国際化対応

## パフォーマンス・スケーラビリティ

### 最適化

- **Next.js 最適化**: 自動コード分割・最適化
- **画像最適化**: 自動リサイズ・フォーマット変換
- **キャッシュ戦略**: 適切なキャッシュ設定
- **CDN**: 静的アセットの配信

### スケーラビリティ

- **マルチテナント**: サーバーごとの独立
- **水平スケーリング**: 負荷分散対応
- **データベース最適化**: インデックス・クエリ最適化
- **API 制限**: レート制限による保護

## セキュリティ・コンプライアンス

### セキュリティ対策

- **HTTPS**: 全通信の暗号化
- **CORS**: 適切なオリジン制限
- **入力検証**: XSS・CSRF 対策
- **認証・認可**: 適切な権限管理

### プライバシー

- **データ最小化**: 必要最小限のデータ収集
- **暗号化**: 機密データの暗号化
- **アクセス制御**: 適切なアクセス管理
- **監査ログ**: アクセス履歴の記録

---

**最終更新**: 2025 年 7 月 5 日  
**バージョン**: 1.0.0  
**作成者**: NotionTaskBot 開発チーム
