import { createClient } from '@supabase/supabase-js';
import { errorHandler } from './error-handler.ts';

// サーバーサイド専用
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 環境変数のチェック（開発環境でのみ警告）
if (process.env.NODE_ENV === 'development' && (!supabaseUrl || !supabaseKey)) {
  console.warn('⚠️ Supabase環境変数が設定されていません。Bot機能に影響する可能性があります。');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key'
);

// Supabaseエラーハンドリング用のラッパー関数
export const supabaseClient = {
  // セッション関連
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      errorHandler.logError(error as Error, 'supabase-get-session');
      return { success: false, error: errorHandler.createErrorResponse(error as Error) };
    }
  },

  // テーブル操作の汎用ラッパー
  async query<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: string
  ) {
    try {
      const result = await operation();
      if (result.error) throw result.error;
      return { success: true, data: result.data };
    } catch (error) {
      errorHandler.logError(error as Error, `supabase-${context}`);
      return { success: false, error: errorHandler.createErrorResponse(error as Error) };
    }
  },

  // 特定のテーブル操作
  async getGuildConfig(guildId: string) {
    return this.query(
      async () => await supabase.from('guilds').select('*').eq('guild_id', guildId).single(),
      'get-guild-config'
    );
  },

  async saveGuildConfig(config: any) {
    return this.query(
      async () => await supabase.from('guilds').upsert(config),
      'save-guild-config'
    );
  },

  async getCommands(guildId: string) {
    return this.query(
      async () => await supabase.from('commands').select('*').eq('guild_id', guildId).order('created_at', { ascending: true }),
      'get-commands'
    );
  },

  async createCommand(command: any) {
    return this.query(
      async () => await supabase.from('commands').insert(command),
      'create-command'
    );
  },

  async updateCommand(id: string, updates: any) {
    return this.query(
      async () => await supabase.from('commands').update(updates).eq('id', id),
      'update-command'
    );
  },

  async deleteCommand(id: string) {
    return this.query(
      async () => await supabase.from('commands').delete().eq('id', id),
      'delete-command'
    );
  },

  async getSessionData() {
    return this.query(
      async () => await supabase.from('sessions').select('*').single(),
      'get-session-data'
    );
  },

  async saveSession(session: any) {
    return this.query(
      async () => await supabase.from('sessions').upsert(session),
      'save-session'
    );
  },
}; 