import { errorHandler } from './error-handler';

// Bot用のAPIクライアント
export class BotApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }

  // サーバー設定の確認
  async isConfigComplete(guildId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/guilds/${guildId}/config/check`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_API_SECRET}`,
        },
      });

      if (!response.ok) {
        console.error('❌ 設定確認APIエラー:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success && result.data?.isComplete;
    } catch (error) {
      console.error('❌ 設定確認中にエラー:', error);
      return false;
    }
  }

  // サーバー設定の取得
  async getConfig(guildId: string): Promise<{
    notionToken: string;
    notionDatabaseId: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/guilds/${guildId}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_API_SECRET}`,
        },
      });

      if (!response.ok) {
        console.error('❌ 設定取得APIエラー:', response.status, response.statusText);
        return null;
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        console.error('❌ 設定取得失敗:', result.error);
        return null;
      }

      return {
        notionToken: result.data.notion_api_key,
        notionDatabaseId: result.data.notion_database_id,
      };
    } catch (error) {
      console.error('❌ 設定取得中にエラー:', error);
      return null;
    }
  }

  // 設定の保存
  async setConfig(guildId: string, config: {
    notionToken: string;
    notionDatabaseId: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/guilds/${guildId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_API_SECRET}`,
        },
        body: JSON.stringify({
          notion_api_key: config.notionToken,
          notion_database_id: config.notionDatabaseId,
        }),
      });

      if (!response.ok) {
        console.error('❌ 設定保存APIエラー:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ 設定保存中にエラー:', error);
      return false;
    }
  }

  // 設定のリセット
  async resetConfig(guildId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/guilds/${guildId}/config`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOT_API_SECRET}`,
        },
      });

      if (!response.ok) {
        console.error('❌ 設定リセットAPIエラー:', response.status, response.statusText);
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('❌ 設定リセット中にエラー:', error);
      return false;
    }
  }
} 