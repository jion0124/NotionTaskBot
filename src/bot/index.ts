import dotenv from "dotenv";
dotenv.config();

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Client as NotionClient } from "@notionhq/client";
import OpenAI from "openai";
import { BotApiClient } from "../lib/bot-api-client";
import { setupCommands, handleSetupCommand } from "../lib/setup-commands";
import { errorHandler } from "../lib/error-handler";

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;

// 環境変数のチェック
console.log('🔧 Bot起動時の環境変数チェック:');
console.log('DISCORD_BOT_TOKEN:', DISCORD_TOKEN ? '✅ 設定済み' : '❌ 未設定');
console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? '✅ 設定済み' : '❌ 未設定');
console.log('BOT_API_SECRET:', process.env.BOT_API_SECRET ? '✅ 設定済み' : '❌ 未設定');
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL ? '✅ 設定済み' : '❌ 未設定');

function logDev(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
function errorDev(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
function warnDev(...args: any[]) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}

if (!DISCORD_TOKEN) {
  errorDev("❌ Missing DISCORD_BOT_TOKEN environment variable.");
  console.error("❌ Botを起動するにはDISCORD_BOT_TOKENを設定してください。");
  console.error("📝 .env.localファイルを作成して以下の内容を追加してください：");
  console.error("DISCORD_BOT_TOKEN=your_bot_token_here");
  process.exit(1);
}

// Bot API設定の確認
if (!process.env.BOT_API_SECRET) {
  console.warn("⚠️ BOT_API_SECRETが設定されていません。");
  console.warn("📝 セキュアなAPI通信のために以下を設定してください：");
  console.warn("BOT_API_SECRET=your_secure_secret_key");
  console.warn("🔧 Botは起動しますが、API通信が制限されます。");
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  console.warn("⚠️ NEXT_PUBLIC_APP_URLが設定されていません。");
  console.warn("📝 API通信のために以下を設定してください：");
  console.warn("NEXT_PUBLIC_APP_URL=http://localhost:3000");
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const apiClient = new BotApiClient();

type Page = any;

// --- Notionプロパティ抽出関数 ---
const getAssignees = (pg: Page): string[] => {
  const p = pg.properties?.["担当者"];
  return p?.type === "people" ? p.people.map((u: any) => u.name ?? u.id) : [];
};
const getStatus = (pg: Page): string => {
  const p = pg.properties?.["ステータス"];
  if (p?.type === "status") return p.status?.name ?? "";
  if (p?.type === "select") return p.select?.name ?? "";
  return "";
};
const getDueDate = (pg: Page): string => {
  const p = pg.properties?.["期限"];
  return p?.type === "date" && p.date?.start ? p.date.start : "";
};

// --- コマンド定義 ---
const commands = [
  ...setupCommands,
  new SlashCommandBuilder()
    .setName("addtask").setDescription("Notionにタスクを追加")
    .addStringOption(o => o.setName("content").setDescription("タスク内容").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mytasks").setDescription("指定担当者の未完了タスク一覧")
    .addStringOption(o => o.setName("assignee").setDescription("担当者名").setRequired(true)),
  new SlashCommandBuilder()
    .setName("duetasks").setDescription("3日以内の期限タスク一覧")
    .addStringOption(o => o.setName("assignee").setDescription("担当者名").setRequired(false)),
  new SlashCommandBuilder()
    .setName("advise").setDescription("担当者のタスクへのアドバイス")
    .addStringOption(o => o.setName("assignee").setDescription("担当者名").setRequired(true)),
  new SlashCommandBuilder()
    .setName("weekprogress").setDescription("今週作成されたタスク一覧"),
  new SlashCommandBuilder()
    .setName("weekadvise").setDescription("今週期限のタスクへのアドバイス"),
  new SlashCommandBuilder()
    .setName("listassignees").setDescription("上位10名の担当者を表示"),
  new SlashCommandBuilder()
    .setName("liststatus").setDescription("上位10件のステータスを表示"),
].map(c => c.toJSON());

async function registerCommands() {
  await new REST({ version: '10' })
    .setToken(DISCORD_TOKEN)
    .put(Routes.applicationCommands(client.application!.id), { body: commands });
  logDev('✅ Commands registered');
}

client.once('ready', async () => {
  await registerCommands();
  logDev(`✅ Bot ready: ${client.user?.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction as ChatInputCommandInteraction;

  // --- 設定系コマンド ---
  if (["setup", "config", "reset"].includes(cmd.commandName)) {
    try {
      await handleSetupCommand(cmd, apiClient);
    } catch (e) {
      errorHandler.logError(e as Error, `setup-command-${cmd.commandName}`);
      errorDev('❌ 設定コマンドエラー:', e);
      await cmd.reply({
        content: '⚠️ 設定コマンド実行中にエラーが発生しました。時間をおいて再度お試しください。',
        ephemeral: true
      });
    }
    return;
  }

  // --- 設定チェック ---
  const guildId = cmd.guildId!;
  let isConfigComplete = false;
  try {
    isConfigComplete = await apiClient.isConfigComplete(guildId);
  } catch (e) {
    errorHandler.logError(e as Error, `isConfigComplete-guildId:${guildId}`);
    errorDev('❌ 設定確認エラー:', e);
    await cmd.reply({
      content: '⚠️ 設定の確認中にエラーが発生しました。',
      ephemeral: true
    });
    return;
  }
  if (!isConfigComplete) {
    await cmd.reply({
      content: '❌ 設定が完了していません。まず`/setup`コマンドでNotionの設定を行ってください。',
      ephemeral: true
    });
    return;
  }

  await cmd.deferReply();

  // --- 設定取得 ---
  let userConfig;
  try {
    userConfig = await apiClient.getConfig(guildId);
    if (!userConfig) throw new Error('設定が見つかりません');
  } catch (e) {
    errorHandler.logError(e as Error, `getConfig-guildId:${guildId}`);
    errorDev('❌ 設定取得エラー:', e);
    await cmd.editReply('⚠️ 設定の取得中にエラーが発生しました。再度`/setup`コマンドで設定してください。');
    return;
  }

  const notion = new NotionClient({ auth: userConfig.notionToken });
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  try {
    switch (cmd.commandName) {
      case 'addtask': {
        const content = cmd.options.getString('content', true);
        await notion.pages.create({ 
          parent: { database_id: userConfig.notionDatabaseId }, 
          properties: { 'タスク名': { title: [{ text: { content } }] } } 
        });
        await cmd.editReply('✅ タスクを追加しました。');
        break;
      }
      case 'mytasks': {
        const assignee = cmd.options.getString('assignee', true);
        const resp = await notion.databases.query({
          database_id: userConfig.notionDatabaseId,
          filter: { property: 'ステータス', status: { does_not_equal: '完了' } },
          sorts: [{ property: '期限', direction: 'ascending' }],
          page_size: 100,
        });
        const pages = resp.results as Page[];
        const header = `📋 **${assignee}**さんの未完了タスク一覧:`;
        const list = pages.filter(p => getAssignees(p).includes(assignee));
        const lines = list.map((p,i) => `${i+1}. ${p.properties['タスク名'].title[0]?.plain_text ?? ''} | ステータス: ${getStatus(p)} | 期限: ${getDueDate(p)}`);
        await cmd.editReply([header, lines.join('\n') || '• タスクが見つかりませんでした'].join('\n'));
        break;
      }
      case 'duetasks': {
        const assignee = cmd.options.getString('assignee');
        const now = Date.now();
        const limit = now + 3*24*60*60*1000;
        const resp = await notion.databases.query({ 
          database_id: userConfig.notionDatabaseId, 
          filter: { property: 'ステータス', status: { does_not_equal: '完了' } }, 
          page_size: 100 
        });
        const pages = resp.results as Page[];
        const header = assignee
          ? `📋 **${assignee}** の3日以内のタスク:`
          : '📋 3日以内のタスク一覧:';
        const list = pages.filter(p => {
          const t = Date.parse(getDueDate(p));
          return !isNaN(t) && t>=now && t<=limit && (!assignee || getAssignees(p).includes(assignee));
        });
        const lines = list.map((p,i) =>
          `• ${p.properties['タスク名'].title[0]?.plain_text ?? ''} | 担当: ${getAssignees(p).join(', ') || '-'} | 期限: ${getDueDate(p)}`
        );
        await cmd.editReply([header, lines.join('\n') || '• 該当タスクはありません'].join('\n'));
        break;
      }
      case 'advise': {
        const assignee = cmd.options.getString('assignee', true);
        const resp = await notion.databases.query({ 
          database_id: userConfig.notionDatabaseId, 
          filter: { property: 'ステータス', status: { does_not_equal: '完了' } }, 
          page_size: 100 
        });
        const pages = resp.results as Page[];
        const list = pages.filter(p => getAssignees(p).includes(assignee));
        const header = `📊 **${assignee}** へのタスクアドバイス:`;
        if (!list.length) {
          await cmd.editReply(`${header}\n• タスクが見つかりませんでした`);
          break;
        }
        const prompt = list.map((p,i) => `${i+1}. ${p.properties['タスク名'].title[0]?.plain_text ?? ''} | 期限: ${getDueDate(p)} | 担当: ${getAssignees(p).join(', ')}`).join('\n');
        const ai = await openai.chat.completions.create({ model: 'gpt-4.1-nano', messages: [{ role: 'user', content: `Tasks for ${assignee}:\n${prompt}\nAs a project manager, provide action items:` }] });
        await cmd.editReply([header, ai.choices[0].message?.content ?? ''].join('\n'));
        break;
      }
      case 'weekprogress': {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay()+6)%7));
        monday.setHours(0,0,0,0);
        const resp = await notion.databases.query({ 
          database_id: userConfig.notionDatabaseId, 
          filter: { timestamp: 'created_time', created_time: { on_or_after: monday.toISOString() } }, 
          sorts: [{ timestamp: 'created_time', direction: 'ascending' }], 
          page_size: 100 
        });
        const pages = resp.results as Page[];
        const header = '📅 今週作成されたタスク一覧:';
        const lines = pages.map((p,i) => `${i+1}. ${p.properties['タスク名'].title[0]?.plain_text ?? ''} | 作成: ${new Date(p.created_time).toLocaleString()}`);
        await cmd.editReply([header, lines.join('\n') || '• タスクはありません'].join('\n'));
        break;
      }
      case 'weekadvise': {
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay()+6)%7));
        monday.setHours(0,0,0,0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate()+6);
        const resp = await notion.databases.query({ 
          database_id: userConfig.notionDatabaseId, 
          filter: { and: [ { property: 'ステータス', status: { does_not_equal: '完了' } }, { property: '期限', date: { on_or_after: monday.toISOString(), on_or_before: sunday.toISOString() } } ] }, 
          page_size: 100 
        });
        const pages = resp.results as Page[];
        const header = '📈 今週期限のタスクに対するアドバイス:';
        if (!pages.length) {
          await cmd.editReply(`${header}\n• タスクはありません`);
          break;
        }
        const prompt = pages.map((p,i) => `${i+1}. ${p.properties['タスク名'].title[0]?.plain_text ?? ''} | 期限: ${getDueDate(p)} | 担当: ${getAssignees(p).join(', ')}`).join('\n');
        const ai = await openai.chat.completions.create({ model: 'gpt-4.1-nano', messages: [{ role: 'user', content: `Tasks due this week:\n${prompt}\nAs a PM, suggest next steps:` }] });
        await cmd.editReply([header, ai.choices[0].message?.content ?? ''].join('\n'));
        break;
      }
      case 'listassignees': {
        const resp = await notion.databases.query({ database_id: userConfig.notionDatabaseId, page_size: 10 });
        const pages = resp.results as Page[];
        const header = '👥 Top 10 担当者:';
        const lines = pages.map((p,i) => `**${i+1}**. ${getAssignees(p).join(', ') || '-'}`);
        await cmd.editReply([header, lines.join('\n') || 'None'].join('\n'));
        break;
      }
      case 'liststatus': {
        const resp = await notion.databases.query({ database_id: userConfig.notionDatabaseId, page_size: 10 });
        const pages = resp.results as Page[];
        const header = '🔖 Top 10 ステータス:';
        const lines = pages.map((p,i) => `**${i+1}**. ${getStatus(p) || '-'}`);
        await cmd.editReply([header, lines.join('\n') || 'None'].join('\n'));
        break;
      }
    }
  } catch (e) {
    errorHandler.logError(e as Error, `command-execution-${cmd.commandName}`);
    errorDev(`❌ コマンド(${cmd.commandName})実行エラー:`, e);
    await cmd.editReply('⚠️ コマンド実行中に予期せぬエラーが発生しました。内容を確認のうえ、再度お試しください。');
  }
});

client.login(DISCORD_TOKEN);