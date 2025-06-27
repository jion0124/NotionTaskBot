-- NotionTaskBot データベース設定スクリプト
-- Supabaseで実行してください

-- 1. 現在のテーブル構造を確認（修正版）
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
        WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE'
        ELSE ''
    END as constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu 
    ON c.column_name = kcu.column_name 
    AND c.table_name = kcu.table_name
LEFT JOIN information_schema.table_constraints tc 
    ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'guilds'
ORDER BY c.ordinal_position;

-- 2. guildsテーブルの主キー制約を確認
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'guilds' 
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE');

-- 3. 重複データの確認
SELECT guild_id, COUNT(*) as count
FROM guilds
GROUP BY guild_id
HAVING COUNT(*) > 1;

-- 4. 主キーをguild_idに変更する手順
-- 注意: 既存のデータがある場合は、まず重複を確認してください

-- 4-1. 現在の主キー制約を削除
-- ALTER TABLE guilds DROP CONSTRAINT guilds_pkey;

-- 4-2. guild_idにユニーク制約を追加（重複がない場合のみ）
-- ALTER TABLE guilds ADD CONSTRAINT guilds_guild_id_unique UNIQUE (guild_id);

-- 4-3. guild_idを主キーに設定
-- ALTER TABLE guilds ADD PRIMARY KEY (guild_id);

-- 4-4. 古いidカラムを削除（オプション）
-- ALTER TABLE guilds DROP COLUMN id;

-- 5. 重複データがある場合の対処法
-- 最新のレコードのみを残す（例）
-- DELETE FROM guilds 
-- WHERE id NOT IN (
--     SELECT MAX(id) 
--     FROM guilds 
--     GROUP BY guild_id
-- );

-- 6. テーブル構造の最適化（必要に応じて）
-- CREATE TABLE guilds_optimized (
--     guild_id VARCHAR(255) PRIMARY KEY,
--     guild_name VARCHAR(255) NOT NULL,
--     bot_client_id VARCHAR(255),
--     discord_user_id VARCHAR(255),
--     notion_api_key TEXT,
--     notion_database_id VARCHAR(255),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- 7. RLS（Row Level Security）の設定確認
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'guilds';

-- 8. インデックスの確認
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'guilds';

-- 9. 現在のデータを確認
SELECT 
    id,
    guild_id,
    guild_name,
    CASE 
        WHEN notion_api_key IS NOT NULL THEN 'SET'
        ELSE 'NOT SET'
    END as notion_api_key_status,
    CASE 
        WHEN notion_database_id IS NOT NULL THEN 'SET'
        ELSE 'NOT SET'
    END as notion_database_id_status,
    created_at,
    updated_at
FROM guilds
ORDER BY created_at DESC; 