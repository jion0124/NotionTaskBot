import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { BotApiClient } from './bot-api-client';

export const setupCommands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Notion連携の初期設定')
    .addStringOption(o => o.setName('notion_token').setDescription('Notionの統合トークン').setRequired(true))
    .addStringOption(o => o.setName('notion_database_id').setDescription('NotionデータベースID').setRequired(true)),
  new SlashCommandBuilder()
    .setName('config')
    .setDescription('現在の設定を確認'),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('設定をリセット')
];

export async function handleSetupCommand(
  cmd: ChatInputCommandInteraction,
  apiClient: BotApiClient
) {
  const guildId = cmd.guildId!;
  switch (cmd.commandName) {
    case 'setup': {
      const notionToken = cmd.options.getString('notion_token', true);
      const notionDatabaseId = cmd.options.getString('notion_database_id', true);
      const success = await apiClient.setConfig(guildId, { notionToken, notionDatabaseId });
      if (success) {
        await cmd.reply({ content: '✅ Notion連携設定を保存しました。', ephemeral: true });
      } else {
        await cmd.reply({ content: '❌ 設定の保存に失敗しました。', ephemeral: true });
      }
      break;
    }
    case 'config': {
      const config = await apiClient.getConfig(guildId);
      if (!config) {
        await cmd.reply({ content: '❌ 設定が見つかりません。`/setup`で設定してください。', ephemeral: true });
        return;
      }
      await cmd.reply({
        content: `📝 現在の設定:\n- Notionトークン: ${config.notionToken ? '設定済み' : '未設定'}\n- データベースID: ${config.notionDatabaseId ? config.notionDatabaseId : '未設定'}\n- OpenAIキー: ${process.env.OPENAI_API_KEY ? '設定済み（グローバル）' : '未設定'}`,
        ephemeral: true
      });
      break;
    }
    case 'reset': {
      const success = await apiClient.resetConfig(guildId);
      if (success) {
        await cmd.reply({ content: '✅ 設定をリセットしました。', ephemeral: true });
      } else {
        await cmd.reply({ content: '❌ 設定のリセットに失敗しました。', ephemeral: true });
      }
      break;
    }
  }
} 