export interface Guild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface BotStatus {
  guildId: string;
  hasBot: boolean;
  guildInfo: {
    guild_id: string;
    guild_name: string;
    bot_client_id: string;
    notion_api_key: string | null;
    notion_database_id: string | null;
  } | null;
} 