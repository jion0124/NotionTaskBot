import { UserConfig } from './types';

export class ConfigManager {
  private configs: Map<string, UserConfig> = new Map();

  // 設定を保存
  async saveConfig(guildId: string, config: Partial<UserConfig>): Promise<void> {
    const existing = this.configs.get(guildId);
    const now = new Date();
    
    const newConfig: UserConfig = {
      discordGuildId: guildId,
      notionToken: config.notionToken || '',
      notionDatabaseId: config.notionDatabaseId || '',
      openaiApiKey: config.openaiApiKey,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    this.configs.set(guildId, newConfig);
    
    // TODO: 実際のSaaSではデータベースに保存
    console.log(`Config saved for guild: ${guildId}`);
  }

  // 設定を取得
  async getConfig(guildId: string): Promise<UserConfig | null> {
    return this.configs.get(guildId) || null;
  }

  // 設定が完了しているかチェック
  async isConfigComplete(guildId: string): Promise<boolean> {
    const config = await this.getConfig(guildId);
    return !!(config?.notionToken && config?.notionDatabaseId);
  }

  // 設定を削除
  async deleteConfig(guildId: string): Promise<void> {
    this.configs.delete(guildId);
    console.log(`Config deleted for guild: ${guildId}`);
  }
} 