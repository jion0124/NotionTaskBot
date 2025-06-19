import { supabase } from './supabase';
import { UserConfig } from './types';
import { encrypt, decrypt } from './crypto-util';

export class SupabaseConfigManager {
  // 設定を保存
  async saveConfig(guildId: string, config: Partial<UserConfig>): Promise<void> {
    const now = new Date();
    const { error } = await supabase
      .from('user_configs')
      .upsert({
        discord_guild_id: guildId,
        notion_token: config.notionToken ? encrypt(config.notionToken) : null,
        notion_database_id: config.notionDatabaseId,
        openai_api_key: config.openaiApiKey ? encrypt(config.openaiApiKey) : null,
        updated_at: now.toISOString(),
        created_at: now.toISOString(),
      }, { onConflict: 'discord_guild_id' });
    if (error) throw error;
  }

  // 設定を取得
  async getConfig(guildId: string): Promise<UserConfig | null> {
    const { data, error } = await supabase
      .from('user_configs')
      .select('*')
      .eq('discord_guild_id', guildId)
      .single();
    if (error) return null;
    if (!data) return null;
    return {
      discordGuildId: data.discord_guild_id,
      notionToken: data.notion_token ? decrypt(data.notion_token) : '',
      notionDatabaseId: data.notion_database_id,
      openaiApiKey: data.openai_api_key ? decrypt(data.openai_api_key) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  // 設定が完了しているかチェック
  async isConfigComplete(guildId: string): Promise<boolean> {
    const config = await this.getConfig(guildId);
    return !!(config?.notionToken && config?.notionDatabaseId);
  }

  // 設定を削除
  async deleteConfig(guildId: string): Promise<void> {
    const { error } = await supabase
      .from('user_configs')
      .delete()
      .eq('discord_guild_id', guildId);
    if (error) throw error;
  }
} 