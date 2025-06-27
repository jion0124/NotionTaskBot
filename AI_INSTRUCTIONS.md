# NotionTaskBot - AI 用技術仕様書

## 1. プロジェクト概要

NotionTaskBotは、DiscordとNotionを連携させるSaaSアプリケーションです。Next.js製のWeb管理画面とdiscord.js製のBotで構成され、ユーザーはWeb上でBotの設定を行い、DiscordのチャットからNotionのタスクを管理します。

### 1.1. 主要コンポーネント

*   **Web管理画面**: Next.js (App Router) で構築。ユーザー認証、サーバー選択、Notion連携設定、ダッシュボード機能を提供。
*   **Discord Bot**: discord.jsで構築。スラッシュコマンドに応答し、Notion APIを介してタスクを操作。AI機能も搭載。
*   **データベース**: Supabase (PostgreSQL) を使用。ユーザーセッション、サーバー設定などを永続化。

### 1.2. 技術スタック

*   **フレームワーク**: Next.js 14
*   **言語**: TypeScript
*   **UI**: Tailwind CSS, shadcn/ui
*   **Botフレームワーク**: discord.js
*   **データベース**: Supabase
*   **外部API**: Discord, Notion, OpenAI

## 2. ファイル構造と役割

```
/src
├── app/         # Next.js App Router
│   ├── api/       # APIエンドポイント
│   ├── dashboard/ # 認証後ダッシュボード
│   ├── auth/      # 認証関連ページ
│   └── page.tsx   # ランディングページ
├── bot/         # Discord Botのコアロジック
│   └── index.ts   # Botのエントリーポイント
├── lib/         # 共通ライブラリ
│   ├── notion.ts  # Notion APIクライアント
│   ├── supabase.ts# Supabaseクライアント
│   ├── discord.ts # Discord API関連処理
│   └── actions.ts # Server Actions
└── components/  # UIコンポーネント
```

*   `src/app/api/`: バックエンドAPI。主にWeb管理画面から呼び出される。
*   `src/bot/index.ts`: Botの起動、コマンド登録、イベントハンドリングを行う。
*   `src/lib/notion.ts`: Notion APIとの通信をカプセル化するクライアントクラス。
*   `src/lib/supabase.ts`: Supabaseとの通信をカプセル化するクライアント。
*   `src/middleware.ts`: セキュリティヘッダー、CORS、APIレートリミットなどを処理する。

## 3. データフロー

### 3.1. Web管理画面でのNotion設定

1.  ユーザーがWeb管理画面でNotion APIキーとDB IDを入力。
2.  フロントエンドが `/api/guilds` エンドポイントにPOSTリクエストを送信。
3.  APIがリクエストを受け取り、Supabaseの `guilds` テーブルに設定を保存。

### 3.2. Discord Botでのタスク追加

1.  ユーザーがDiscordで `/addtask` コマンドを実行。
2.  Bot (`src/bot/index.ts`) がインタラクションを検知。
3.  BotがSupabaseから対象サーバーのNotion設定を取得。
4.  `src/lib/notion.ts` のNotionクライアントを使い、Notion APIを呼び出してタスクを作成。

## 🚨 重要な注意事項

### 環境変数ファイルについて

- **絶対に環境変数ファイル（.env, .env.local 等）を作成・編集しないでください**
- ユーザーが既に環境変数を設定済みです
- 環境変数に関する質問や設定方法の説明は可能ですが、ファイル操作は禁止です

### プロジェクト構成

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** コンポーネント
- **Supabase** (データベース)
- **Discord OAuth2** (認証)

## 📋 実装済み機能

### 1. 認証システム

- Discord OAuth2 認証
- ユーザーセッション管理
- 管理者権限のあるサーバー取得

### 2. サーバー管理

- サーバー選択画面
- 動的 Bot 招待機能
- カスタム Bot とデフォルト Bot の両方対応

### 3. ダッシュボード

- サーバー別管理画面
- ステータス表示
- 機能別ナビゲーション

### 4. コマンド管理

- コマンドの作成・編集・削除
- 有効/無効切り替え
- レスポンス設定

## 🔧 技術仕様

### フロントエンド

- **Next.js 14** (App Router)
- **TypeScript** (型安全性)
- **Tailwind CSS** (スタイリング)
- **shadcn/ui** (UI コンポーネント)

### バックエンド

- **Supabase** (データベース・認証)
- **Discord API** (OAuth2・Bot 招待)

### データベース設計

```sql
-- セッション管理
sessions (
  discord_user_id,
  discord_username,
  discord_avatar,
  access_token,
  refresh_token,
  expires_at
)

-- サーバー設定
guilds (
  guild_id,
  guild_name,
  bot_client_id,
  notion_integration_token,
  notion_database_id,
  discord_user_id
)

-- コマンド管理
commands (
  id,
  guild_id,
  name,
  description,
  enabled,
  response_text,
  created_at
)
```

## 🎯 開発方針

### 1. ユーザー体験優先

- 直感的な UI/UX
- エラーハンドリング
- ローディング状態の適切な表示

### 2. セキュリティ

- 適切な認証・認可
- 環境変数の安全な管理
- 入力値の検証

### 3. スケーラビリティ

- 複数ユーザー対応
- 複数サーバー対応
- モジュラー設計

## 🚫 禁止事項

1.  **環境変数ファイルの作成・編集**
2.  **機密情報のハードコーディング**
3.  **セキュリティを損なう実装**
4.  **既存機能の破壊的変更**
5.  **gitへのコミット**

## ✅ 推奨事項

1.  **型安全性の維持**
2.  **エラーハンドリングの実装**
3.  **レスポンシブデザイン**
4.  **アクセシビリティの考慮**
5.  **パフォーマンスの最適化**

## 📝 コーディング規約

-   **TypeScript**の型定義を適切に使用
-   **shadcn/ui**コンポーネントを優先使用
-   **Tailwind CSS**クラスを一貫して使用
-   **ESLint**と**Prettier**の設定に従う
-   **コミットメッセージ**は日本語で分かりやすく

## 🔄 開発フロー

1.  **機能要件の確認**
2.  **型定義の作成**
3.  **UI コンポーネントの実装**
4.  **API 連携の実装**
5.  **エラーハンドリング**
6.  **テスト・動作確認**

## 🚨 Next.js + Supabase 開発で AI が間違えやすいポイント

### 1. ルートグループの誤認識

-   例: `/src/app/(admin)/page.tsx` などのルートグループを「ネストルーティング」として認識しがちだが、ルートグループはルーティングとしては認識されない
-   トップページの `page.tsx` と競合するためエラーになる

### 2. useEffect()の多用

-   ベストプラクティスは「サーバーコンポーネントでのデータフェッチ」
-   DAL（Data Access Layer）等でデータ取得用のファイルを作成し、呼び出しはサーバーコンポーネントで行う

### 3. ストリーミングデータフェッチング未対応

-   サーバーコンポーネント＋ Suspense でストリーミングデータフェッチングを行い、スケルトン表示を実装する

### 4. Server Actions 未使用

-   「Server Actions で実装して」と明示しないと、イベントハンドラで実装しがち
-   可能な限り Server Actions を利用すること

### 5. useSearchParams や動的ルーティングのパラメータ受け取り

-   `/blog/[id]` などの params 受け取りは、`async/await`で非同期に受け取る必要がある

### 6. Supabase のクライアント/サーバー使い分け

-   サーバー側で実行する場合は `createServerClient()` を利用
-   クライアント側で実行する場合は `createClient()` を利用
-   モジュールは `@supabase/supabase-js` と `@supabase/ssr` を利用する

## 🔧 エラーハンドリング

### 実装済みエラー対策システム

1.  **統一エラーハンドリングシステム** (`src/lib/error-handler.ts`)

    -   AppError クラスによる統一されたエラー形式
    -   エラーコード定義による全エラータイプの分類
    -   自動ログ記録と外部送信
    -   自動リトライと指数バックオフ

2.  **Discord API エラー対策** (`src/lib/discord.ts`)

    -   最大 3 回の自動リトライ
    -   429 エラー時の自動待機
    -   認証コードの形式チェック
    -   ユーザーフレンドリーなエラーメッセージ

3.  **認証フロー改善** (`src/lib/actions.auth.ts`)
    -   認証コードの重複使用チェック
    -   1 分間に 5 回までのレート制限
    -   既存セッションの更新処理
    -   詳細なエラー情報の記録

## 📚 参考資料

-   [Next.js 14 Documentation](https://nextjs.org/docs)
-   [Discord Developer Portal](https://discord.com/developers/docs)
-   [Supabase Documentation](https://supabase.com/docs)
-   [shadcn/ui Components](https://ui.shadcn.com/)
-   [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🎯 今後の実装予定

### 短期目標

-   Notion API 連携の実装
-   リアルタイムタスク同期
-   コマンド使用分析機能

### 中期目標

-   複数 Notion データベース対応
-   テンプレート機能
-   チーム機能

### 長期目標

-   他のプロジェクト管理ツール連携
-   AI 機能の追加
-   モバイルアプリ開発

## 🚨 モデル指定ルール

-   **AI 機能で利用する OpenAI モデルは常に `gpt-4.1-nano` を指定すること。**
    -   他のモデル（gpt-4o, gpt-3.5-turbo 等）は一切使用しない。
    -   コード・API リクエスト・ドキュメント全てでこのルールを厳守すること。

---

**これらの注意点を必ず守り、SaaS 管理画面の設計・実装は Next.js（App Router, TypeScript, Tailwind CSS, shadcn/ui）を前提として進めてください。**

---

**AIへの指示:**

-   **gitへのコミットは一切行わない。**