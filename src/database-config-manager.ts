import { UserConfig } from './types';

// 実際のSaaSでは、PostgreSQL、MySQL、MongoDBなどのデータベースを使用
export class DatabaseConfigManager {
  private configs: Map<string, UserConfig> = new Map(); // 一時的なメモリ保存

  constructor() {
    // TODO: データベース接続の初期化
    // 例: PostgreSQL、MySQL、MongoDB、Redisなど
  }

  // 設定を保存（データベースに永続化）
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
    
    // TODO: 実際のデータベースに保存
    // 例: await db.query('INSERT INTO user_configs (...) VALUES (...) ON CONFLICT (...) DO UPDATE SET ...')
    console.log(`Config saved to database for guild: ${guildId}`);
  }

  // 設定を取得（データベースから読み込み）
  async getConfig(guildId: string): Promise<UserConfig | null> {
    // TODO: データベースから読み込み
    // 例: const result = await db.query('SELECT * FROM user_configs WHERE discord_guild_id = $1', [guildId])
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
    // TODO: データベースから削除
    // 例: await db.query('DELETE FROM user_configs WHERE discord_guild_id = $1', [guildId])
    console.log(`Config deleted from database for guild: ${guildId}`);
  }

  // 全ユーザーの設定を取得（管理者用）
  async getAllConfigs(): Promise<UserConfig[]> {
    // TODO: データベースから全設定を取得
    // 例: const result = await db.query('SELECT * FROM user_configs')
    return Array.from(this.configs.values());
  }

  // 統計情報を取得
  async getStats(): Promise<{ totalUsers: number; activeUsers: number }> {
    const configs = await this.getAllConfigs();
    const activeUsers = configs.filter(c => c.notionToken && c.notionDatabaseId).length;
    
    return {
      totalUsers: configs.length,
      activeUsers
    };
  }
} 