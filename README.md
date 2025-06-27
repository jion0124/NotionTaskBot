# NotionTaskBot - Discord と Notion を連携したタスク管理ボット

Discord と Notion を連携したタスク管理ボットの SaaS 版管理画面です。ユーザーは自分の Discord アカウントでログインし、管理者権限を持つサーバーに Bot を追加して、Discord チャットから直接 Notion にタスクを管理できます。

## ✅ 実装状況

**Discord Bot が完全に実装されました！**

### 🔍 実装済み機能

- ✅ **Web 管理画面** (Next.js)
- ✅ **Discord OAuth2 認証** (ユーザーログイン)
- ✅ **Supabase データベース** (設定保存)
- ✅ **Notion API 連携** (タスク管理)
- ✅ **Discord Bot 本体** (discord.js)
- ✅ **Bot コマンド処理** (スラッシュコマンド)
- ✅ **Bot 起動スクリプト**
- ✅ **AI 機能** (GPT-4o-mini 連携)

## 🚀 ローカルでの起動方法

### 前提条件

- **Node.js**: 18.0.0 以上
- **npm**: 9.0.0 以上
- **Git**: バージョン管理

### 1. プロジェクトのセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd NotionTaskBot

# 依存関係のインストール
npm install
```

### 2. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Discord Bot 設定
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXT_PUBLIC_BOT_CLIENT_ID=your_bot_client_id

# Discord Bot Token (必須)
DISCORD_BOT_TOKEN=your_bot_token_here

# Supabase 設定 (削除)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI 設定 (AI機能用)
OPENAI_API_KEY=your_openai_api_key_here

# アプリケーション設定
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback

# 暗号化キー（任意）
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=your_encryption_key
```

**⚠️ 重要**: ポート番号は **3000** に固定されています。環境変数の `NEXT_PUBLIC_APP_URL` と `NEXT_PUBLIC_REDIRECT_URI` は必ず `http://localhost:3000` を使用してください。

#### 環境変数の取得方法

1. **Discord Bot Token**:

   - [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
   - Bot セクションで Token を生成
   - 必要な権限: `Send Messages`, `Use Slash Commands`, `Read Message History`
   - **重要**: Bot セクションの「Privileged Gateway Intents」で以下を有効にする：
     - ✅ MESSAGE CONTENT INTENT
     - ✅ SERVER MEMBERS INTENT
     - ✅ PRESENCE INTENT

2. **Discord Client ID**:

   - 同じ Discord Developer Portal の General Information から取得

3. **Supabase 設定**:

   - [Supabase](https://supabase.com) でプロジェクトを作成
   - Settings > API から URL と anon key を取得

4. **OpenAI API Key**:
   - [OpenAI Platform](https://platform.openai.com/api-keys) で API キーを生成

#### Discord Developer Portal での詳細設定手順

1. **アプリケーション作成**:

   - [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
   - 「New Application」をクリック
   - アプリケーション名を入力して作成

2. **Bot の作成**:

   - 左メニューから「Bot」を選択
   - 「Add Bot」をクリック
   - Bot の名前を設定

3. **Privileged Gateway Intents の設定**:

   - Bot セクションで「Privileged Gateway Intents」を探す
   - 以下の項目を有効にする：
     - ✅ MESSAGE CONTENT INTENT
     - ✅ SERVER MEMBERS INTENT
     - ✅ PRESENCE INTENT
   - 「Save Changes」をクリック

4. **Bot Token の取得**:

   - 「Token」セクションで「Reset Token」をクリック
   - 表示されたトークンをコピー（`.env.local`の`DISCORD_BOT_TOKEN`に設定）

5. **OAuth2 設定**:

   - 左メニューから「OAuth2」→「General」を選択
   - 「Client ID」をコピー（`.env.local`の`NEXT_PUBLIC_BOT_CLIENT_ID`に設定）

6. **Bot の招待**:
   - 左メニューから「OAuth2」→「URL Generator」を選択
   - Scopes で「bot」を選択
   - Bot Permissions で以下を選択：
     - Send Messages
     - Use Slash Commands
     - Read Message History
     - Manage Messages
   - 生成された URL で Bot をサーバーに招待

### 3. データベースのセットアップ

Supabase で以下のテーブルを作成してください：

```sql
-- ユーザーセッション管理
CREATE TABLE sessions (
  discord_user_id VARCHAR PRIMARY KEY,
  discord_username VARCHAR NOT NULL,
  discord_avatar VARCHAR,
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- サーバー設定管理
CREATE TABLE guilds (
  guild_id VARCHAR PRIMARY KEY,
  guild_name VARCHAR NOT NULL,
  bot_client_id VARCHAR NOT NULL,
  notion_api_key VARCHAR,
  notion_database_id VARCHAR,
  discord_user_id VARCHAR REFERENCES sessions(discord_user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- コマンド管理
CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id VARCHAR REFERENCES guilds(guild_id),
  name VARCHAR NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  response_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- updated_atカラムの自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guilds_updated_at
    BEFORE UPDATE ON guilds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. アプリケーションの起動

#### Web 管理画面の起動

```bash
# 開発サーバーを起動（ポート3000固定）
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスしてアプリケーションを確認できます。

**⚠️ 注意**: 開発サーバーはポート 3000 に固定されています。他のアプリケーションがポート 3000 を使用している場合は、先に停止してください。

#### Discord Bot の起動

```bash
# Botを起動
npm run bot

# 開発モードでBotを起動（ファイル変更時に自動再起動）
npm run bot:dev
```

### 5. 利用可能なコマンド

```bash
npm run dev      # Web管理画面起動（ポート3000固定）
npm run bot      # Discord Bot起動
npm run bot:dev  # Discord Bot開発モード起動
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # コード品質チェック
npm run type-check # TypeScript型チェック
```

## 🤖 Discord Bot の機能

### 📝 利用可能なスラッシュコマンド

#### タスク管理

- `/addtask` - Notion にタスクを追加
- `/listtasks` - タスク一覧表示
- `/mytasks` - 自分の未完了タスク
- `/duetasks` - 3 日以内の期限タスク
- `/updatetask` - タスクを更新
- `/deletetask` - タスクを削除

#### 🤖 AI 機能

- `/ai` - AI アシスタントとチャット
- `/ai-task` - AI にタスク作成を依頼

#### 設定管理

- `/setup` - Notion 設定
- `/config` - 設定確認
- `/reset` - 設定リセット

#### その他

- `/help` - ヘルプ表示

### 🎯 主な機能

1. **タスク作成**: Discord から直接 Notion にタスクを作成
2. **タスク一覧**: ステータスや担当者でフィルタリング可能
3. **期限管理**: 3 日以内の期限タスクを自動表示
4. **設定管理**: サーバーごとの Notion 設定
5. **エラーハンドリング**: 包括的なエラー処理とログ機能
6. **AI アシスタント**: GPT-4o-mini による自然言語でのタスク管理

### 🤖 AI 機能の詳細

#### `/ai` コマンド

- **機能**: AI アシスタントとチャット
- **用途**: タスク管理の質問、プロジェクト管理のアドバイス
- **モデル**: GPT-4.1-nano
- **特徴**: タスク管理に特化した回答

#### `/ai-task` コマンド

- **機能**: AI にタスク作成を依頼
- **入力**: 自然言語でのタスク説明
- **出力**: 構造化されたタスク（タイトル、説明、ステータス、優先度、担当者、期限）
- **自動化**: AI が適切なタスク構造を提案し、Notion に自動作成

#### AI 機能の例

```
/ai message: プロジェクトの進捗管理のベストプラクティスを教えて

/ai-task description: 来週の金曜日までにWebサイトのデザインを完成させる
```

## 📋 主な機能

### 1. Discord 認証・サーバー管理

- **Discord OAuth2 認証**: ユーザーが Discord アカウントでログイン
- **サーバー選択**: 管理者権限を持つ Discord サーバーのみ表示
- **Bot 招待**: ワンクリックで Bot をサーバーに追加

### 2. 動的 Bot 管理

- **カスタム Bot**: ユーザーが自分の Bot Client ID を入力
- **デフォルト Bot**: 共有 Bot を使用
- **Bot 設定保存**: Supabase に Bot 設定を永続化

### 3. 管理ダッシュボード

- **サーバー別管理**: 各サーバー専用の管理画面
- **ステータス表示**: Bot 接続状況、Notion 連携状況
- **機能別ナビゲーション**: コマンド管理、設定、分析など

### 4. コマンド管理

- **コマンド作成**: スラッシュコマンドやメッセージコマンド
- **レスポンス設定**: カスタム応答メッセージ
- **有効/無効切り替え**: コマンドのオン/オフ制御

### 5. Notion 連携

- **API 設定**: Notion インテグレーショントークン設定
- **データベース連携**: タスクデータベースの指定
- **リアルタイム同期**: Discord と Notion の双方向同期

### 6. AI 機能

- **自然言語処理**: 自然言語でのタスク管理
- **インテリジェント提案**: AI による最適なタスク構造の提案
- **自動化**: 複雑なタスク作成プロセスの自動化

## 🛠️ 技術スタック

### フロントエンド

- **Next.js 14**: App Router を使用したモダンなフレームワーク
- **TypeScript**: 型安全性による開発効率向上
- **Tailwind CSS**: ユーティリティファーストの CSS フレームワーク
- **shadcn/ui**: 美しく一貫性のある UI コンポーネント

### バックエンド

- **Supabase**: PostgreSQL ベースの BaaS
- **Discord API**: OAuth2 認証と Bot 招待
- **Next.js API Routes**: サーバーサイド処理

### Bot

- **discord.js**: Discord Bot フレームワーク
- **TypeScript**: 型安全性
- **Notion API**: タスク管理連携
- **OpenAI API**: GPT-4o-mini による AI 機能

## 🔒 セキュリティ

### 認証・認可

- **OAuth2**: Discord 公式認証システム
- **セッション管理**: Supabase による安全なセッション管理
- **権限チェック**: 管理者権限の適切な検証

### データ保護

- **環境変数**: 機密情報の安全な管理
- **HTTPS**: 本番環境での暗号化通信
- **入力検証**: XSS・CSRF 対策

## 🚀 デプロイメント

### 本番環境

- **プラットフォーム**: Vercel 推奨
- **環境変数**: 本番用の設定
- **ドメイン**: カスタムドメイン対応

## 📈 今後の拡張予定

### 短期目標

- [x] Discord Bot 本体の実装
- [x] Bot コマンド処理の実装
- [x] Notion API 連携の実装
- [x] リアルタイムタスク同期
- [x] AI 機能の追加
- [ ] コマンド使用分析機能

### 中期目標

- [ ] 複数 Notion データベース対応
- [ ] テンプレート機能
- [ ] チーム機能
- [ ] AI によるタスク分析・予測

### 長期目標

- [ ] 他のプロジェクト管理ツール連携
- [ ] 高度な AI 機能の追加
- [ ] モバイルアプリ開発

## 🛠️ トラブルシューティング

### よくある問題

1. **環境変数の設定ミス**

   - `.env.local` ファイルが正しく作成されているか確認
   - すべての必須環境変数が設定されているか確認

2. **Discord API エラー**

   - Discord Developer Portal の設定を確認
   - Client ID と Client Secret が正しいか確認
   - Bot Token が正しく設定されているか確認

3. **Supabase 接続エラー**

   - データベースの接続設定を確認
   - テーブルが正しく作成されているか確認

4. **ポート競合**

   - 3000 番ポートが使用中の場合、別のポートを指定
   - `npm run dev -- -p 3001` でポートを変更

5. **Bot が動作しない**

   - Bot の実装が完了しているか確認
   - `DISCORD_BOT_TOKEN` が正しく設定されているか確認
   - Bot に適切な権限が付与されているか確認
   - Discord Developer Portal で Bot の Privileged Gateway Intents が有効になっているか確認

6. **AI 機能が動作しない**
   - `OPENAI_API_KEY` が正しく設定されているか確認
   - OpenAI API の利用制限に達していないか確認

### デバッグ方法

- ブラウザの開発者ツールでコンソールエラーを確認
- 開発環境では詳細なエラーメッセージが表示されます
- Supabase のダッシュボードでログを確認

## 📞 サポート

### ドキュメント

- **技術仕様**: `AI_INSTRUCTIONS.md`
- **エラー対策**: `COMPREHENSIVE_ERROR_HANDLING.md`
- **API 仕様**: Discord API、Supabase API
- **コンポーネント**: shadcn/ui ドキュメント

### 参考リンク

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord.js Documentation](https://discord.js.org/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📋 ライセンス

MIT License

---

**NotionTaskBot** - Discord と Notion を連携した次世代タスク管理ボット
