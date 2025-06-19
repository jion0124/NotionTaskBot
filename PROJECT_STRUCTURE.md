# NotionTaskBot プロジェクト構成・機能まとめ

## 📁 ディレクトリ構成

```
NotionTaskBot/
├── src/
│   ├── index.ts                  # エントリーポイント。Discord Botの本体
│   ├── setup-commands.ts         # /setup, /config, /reset など設定系コマンドの定義と処理
│   ├── supabase-config-manager.ts# Supabaseを使ったユーザー設定の保存・取得・削除
│   ├── supabase.ts               # Supabaseクライアントの初期化
│   ├── crypto-util.ts            # APIキー等の暗号化・復号化ユーティリティ
│   ├── types.ts                  # 型定義（UserConfigなど）
│   ├── config-manager.ts         # （旧）メモリ保存用ConfigManager（今は未使用）
│   └── database-config-manager.ts# （例）DB保存用ConfigManager（今は未使用）
├── package.json                  # 依存パッケージ・スクリプト
├── tsconfig.json                 # TypeScript設定
├── .env                          # 環境変数（APIキー等はここに）
├── README.md                     # サービス全体の説明・SaaS化のポイント
└── PROJECT_STRUCTURE.md          # ← このファイル
```

## 🗂️ 各ファイルの役割

- **index.ts**
  - Discord Bot の本体。コマンド受付・Notion/OpenAI 連携・SupabaseConfigManager 利用
- **setup-commands.ts**
  - `/setup` `/config` `/reset` など設定系コマンドの定義と処理
- **supabase-config-manager.ts**
  - Supabase にユーザー設定（API キー等）を暗号化して保存・取得・削除するクラス
- **supabase.ts**
  - Supabase クライアントの初期化（URL/ServiceKey は.env から取得）
- **crypto-util.ts**
  - API キーなどの暗号化・復号化（AES-256-CBC）
- **types.ts**
  - 型定義（UserConfig, DatabaseConfig など）
- **config-manager.ts**
  - メモリ保存用の ConfigManager（今は未使用。テストやローカル用）
- **database-config-manager.ts**
  - DB 保存用 ConfigManager の例（今は未使用。拡張用）

## ✅ できること（主な機能）

- Discord コマンドで Notion タスク管理
  - `/addtask` タスク追加
  - `/mytasks` 担当者の未完了タスク一覧
  - `/duetasks` 3 日以内の期限タスク
  - `/advise` タスクのアドバイス（OpenAI 連携）
  - `/weekprogress` 今週作成タスク
  - `/weekadvise` 今週期限タスクのアドバイス
  - `/listassignees` 担当者一覧
  - `/liststatus` ステータス一覧
- 設定コマンド
  - `/setup` Notion API キー・DB ID・OpenAI キーの登録
  - `/config` 設定内容の確認
  - `/reset` 設定のリセット
- ユーザーごとに Notion API キー等を**暗号化して Supabase に保存**
- サーバー再起動やスケールアウトでも設定が消えない
- セキュリティ（API キーは DB 上で暗号化、.env で管理）

## 💡 今後の拡張例

- 管理者向けコマンド（統計・全設定一覧）
- Web ダッシュボード連携
- Stripe 等による課金
- 監査ログ・使用量トラッキング
- テストコード追加

---

**このファイルは自動生成・自動更新されます。新しい機能やファイルが増えたら随時追記します！**
