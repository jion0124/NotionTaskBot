import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { SupabaseConfigManager } from "./supabase-config-manager";

function isValidNotionToken(token: string): boolean {
  // Notionのインテグレーショントークンは secret_ または ntn_ で始まる
  return /^secret_[a-zA-Z0-9]{40,50}$/.test(token) || /^ntn_[a-zA-Z0-9]{32,}$/.test(token);
}
function isValidDatabaseId(id: string): boolean {
  // Notion DB IDは32文字の英数字+ハイフン
  return /^[a-f0-9\-]{32,}$/.test(id);
}
function isValidOpenAIKey(key: string): boolean {
  // OpenAIキーはsk-で始まる
  return /^sk-[a-zA-Z0-9]{32,}$/.test(key);
}

export const setupCommands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Notionの設定を行います")
    .addStringOption(o => 
      o.setName("notion_token")
        .setDescription("NotionのAPIトークン")
        .setRequired(true)
    )
    .addStringOption(o => 
      o.setName("database_id")
        .setDescription("NotionのデータベースID")
        .setRequired(true)
    )
    .addStringOption(o => 
      o.setName("openai_key")
        .setDescription("OpenAIのAPIキー（オプション）")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("config")
    .setDescription("現在の設定を確認します"),
  new SlashCommandBuilder()
    .setName("reset")
    .setDescription("設定をリセットします"),
];

export async function handleSetupCommand(
  interaction: ChatInputCommandInteraction,
  configManager: SupabaseConfigManager
) {
  const guildId = interaction.guildId!;
  
  switch (interaction.commandName) {
    case 'setup': {
      const notionToken = interaction.options.getString('notion_token', true);
      const databaseId = interaction.options.getString('database_id', true);
      const openaiKey = interaction.options.getString('openai_key');

      // バリデーション
      if (!isValidNotionToken(notionToken)) {
        await interaction.reply({
          content: '❌ NotionのAPIトークンの形式が正しくありません。`secret_xxx`で始まる値を入力してください。',
          ephemeral: true
        });
        return;
      }
      if (!isValidDatabaseId(databaseId)) {
        await interaction.reply({
          content: '❌ NotionのデータベースIDの形式が正しくありません。',
          ephemeral: true
        });
        return;
      }
      if (openaiKey && !isValidOpenAIKey(openaiKey)) {
        await interaction.reply({
          content: '❌ OpenAIのAPIキーの形式が正しくありません。',
          ephemeral: true
        });
        return;
      }

      await configManager.saveConfig(guildId, {
        notionToken,
        notionDatabaseId: databaseId,
        openaiApiKey: openaiKey || undefined,
      });

      await interaction.reply({
        content: '✅ 設定が完了しました！\n\n**設定内容:**\n• Notion APIトークン: 設定済み\n• データベースID: 設定済み\n• OpenAI APIキー: ' + (openaiKey ? '設定済み' : '未設定'),
        ephemeral: true
      });
      break;
    }
    
    case 'config': {
      const config = await configManager.getConfig(guildId);
      if (!config) {
        await interaction.reply({
          content: '❌ 設定が完了していません。`/setup`コマンドで設定してください。',
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `📋 **現在の設定**\n\n• Notion APIトークン: ${config.notionToken ? '✅ 設定済み' : '❌ 未設定'}\n• データベースID: ${config.notionDatabaseId ? '✅ 設定済み' : '❌ 未設定'}\n• OpenAI APIキー: ${config.openaiApiKey ? '✅ 設定済み' : '❌ 未設定'}\n\n最終更新: ${config.updatedAt.toLocaleString()}`,
        ephemeral: true
      });
      break;
    }
    
    case 'reset': {
      await configManager.deleteConfig(guildId);
      await interaction.reply({
        content: '🗑️ 設定をリセットしました。再度`/setup`コマンドで設定してください。',
        ephemeral: true
      });
      break;
    }
  }
} 