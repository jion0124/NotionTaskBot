# NotionTaskBot - SaaS 版

Discord と Notion を連携したタスク管理ボットの SaaS 版です。

## 🚀 SaaS 化の改善点

### 1. マルチテナント対応

- 各 Discord サーバー（Guild）ごとに独立した設定管理
- ユーザーごとの Notion API キーとデータベース ID の管理
- 設定コマンド（`/setup`, `/config`, `/reset`）の追加

### 2. セキュリティの向上

- 環境変数での API キー管理から、ユーザー設定ベースに変更
- 各ユーザーの API キーを個別に暗号化して保存
- 設定の確認・リセット機能

### 3. スケーラビリティ

- データベース連携による永続化
- 統計情報の取得機能
- 管理者向け機能の追加

## 📋 使用方法

### 初期設定

1. Discord サーバーにボットを招待
2. `/setup`コマンドで Notion の設定を行う
   - Notion API トークン
   - データベース ID
   - OpenAI API キー（オプション）

### 利用可能なコマンド

- `/setup` - Notion の設定を行う
- `/config` - 現在の設定を確認
- `/reset` - 設定をリセット
- `/addtask` - タスクを追加
- `/mytasks` - 担当者の未完了タスク一覧
- `/duetasks` - 3 日以内の期限タスク
- `/advise` - タスクのアドバイス
- `/weekprogress` - 今週作成されたタスク
- `/weekadvise` - 今週期限のタスクアドバイス
- `/listassignees` - 担当者一覧
- `/liststatus` - ステータス一覧

## 🛠️ 技術的な改善案

### 1. データベース連携

```typescript
// PostgreSQL例
CREATE TABLE user_configs (
  id SERIAL PRIMARY KEY,
  discord_guild_id VARCHAR(255) UNIQUE NOT NULL,
  notion_token TEXT NOT NULL,
  notion_database_id VARCHAR(255) NOT NULL,
  openai_api_key TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 暗号化

```typescript
import crypto from "crypto";

// APIキーの暗号化
const encrypt = (text: string, secretKey: string): string => {
  const cipher = crypto.createCipher("aes-256-cbc", secretKey);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

// APIキーの復号化
const decrypt = (encryptedText: string, secretKey: string): string => {
  const decipher = crypto.createDecipher("aes-256-cbc", secretKey);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
```

### 3. レート制限

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // リクエスト制限
  message: "Too many requests from this IP",
});
```

### 4. 監視・ログ

```typescript
// 使用量の追跡
interface UsageStats {
  guildId: string;
  commandCount: number;
  lastUsed: Date;
  apiCalls: number;
}
```

## 🔧 環境変数

```env
DISCORD_TOKEN=your_discord_bot_token
OPENAI_API_KEY=your_openai_api_key  # デフォルト用
DATABASE_URL=your_database_url
ENCRYPTION_KEY=your_encryption_key
```

## 📊 SaaS 化のメリット

### ユーザー側

- 簡単な設定で利用開始
- 自分の Notion データベースとの連携
- セキュアな API キー管理

### 提供者側

- マルチテナント対応
- 使用量の追跡
- 課金システムとの連携可能
- スケーラブルなアーキテクチャ

## 🚀 次のステップ

1. **データベース実装**: PostgreSQL/MySQL の接続
2. **暗号化**: API キーの安全な保存
3. **監視**: 使用量・エラーの追跡
4. **課金**: Stripe 等との連携
5. **管理画面**: Web ダッシュボードの作成
6. **通知**: メール通知機能
7. **API**: REST API の提供

## �� ライセンス

MIT License
