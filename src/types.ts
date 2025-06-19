export interface UserConfig {
  discordGuildId: string;
  notionToken: string;
  notionDatabaseId: string;
  openaiApiKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
} 