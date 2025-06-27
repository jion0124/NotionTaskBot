# NotionTaskBot 管理画面 仕様書

## 概要

Discord サーバーと Notion を連携し、タスク管理を行う Bot の管理 Web アプリ。サーバーごとに Bot 追加・Notion 連携・コマンド管理が可能。

## 主な機能

- Discord OAuth2 認証
- サーバー一覧・検索・Bot 追加/管理
- サーバーごとの詳細ダッシュボード
- Notion 連携設定
- コマンド一覧・説明
- エラー/トラブルシューティング案内

## 技術スタック

- Next.js (App Router)
- TypeScript, React Hooks
- Supabase (DB)
- Lucide React (アイコン)
- Tailwind CSS

## ディレクトリ構成

```
src/
  app/
    dashboard/
      page.tsx                # サーバー一覧ダッシュボード
      [guildId]/page.tsx      # サーバー個別ダッシュボード
  components/
    dashboard/
      GuildCard.tsx           # サーバーカードUI
      GuildStatusBadge.tsx    # ステータスバッジUI
    ui/...
  hooks/
    useCookie.ts             # クッキー取得
    useDiscordGuilds.ts      # サーバー・Bot状態取得
  types/
    guild.ts                 # Guild, BotStatus型
  lib/...
```

## 型定義

- `Guild` … Discord サーバー情報
- `BotStatus` … Bot/Notion 連携状態

## hooks

- `useCookie` … クッキー値取得
- `useDiscordGuilds` … サーバー・Bot 状態一括取得

## UI 部品

- `GuildCard` … サーバーごとのカード表示・アクション
- `GuildStatusBadge` … Bot/Notion 状態バッジ

## ページ構成

### `/dashboard`

- サーバー一覧・検索・Bot 追加/管理ボタン
- サーバーカード（Bot 追加済み/未追加、Notion 連携済み/未設定）
- 検索バー・エラー表示・ログアウト

### `/dashboard/[guildId]`

- サーバー個別の詳細ダッシュボード
- Notion 連携・コマンド管理・クイックスタート
- 「ダッシュボードに戻る」ボタン

## 拡張・保守ポイント

- hooks/UI 部品/型を共通化し、他画面でも再利用可能
- API 通信・認証・エラー処理も hooks 化で保守性向上
- UI テーマやアクセシビリティも Tailwind で柔軟に拡張可

## 備考

- サーバー追加・Bot 追加・Notion 連携のフローは API/DB と連携
- エラー時は詳細なメッセージとトラブルシューティング案内
- コード分割・責務分離を徹底し、今後の機能追加も容易
