// src/index.ts

import dotenv from "dotenv";
dotenv.config();

console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY);
console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY);
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
import { SupabaseConfigManager } from "./supabase-config-manager";
import { setupCommands, handleSetupCommand } from "./setup-commands";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN as string;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string;

if (!DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN environment variable.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const configManager = new SupabaseConfigManager();

type Page = any;

// Extractors
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

// Commands definitions
const commands = [
  ...setupCommands,
  new SlashCommandBuilder()
    .setName("addtask").setDescription("Add a new task to Notion")
    .addStringOption(o => o.setName("content").setDescription("Task content").setRequired(true)),
  new SlashCommandBuilder()
    .setName("mytasks").setDescription("List incomplete tasks for an assignee")
    .addStringOption(o => o.setName("assignee").setDescription("Assignee name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("duetasks").setDescription("List tasks due in the next 3 days")
    .addStringOption(o => o.setName("assignee").setDescription("Assignee name").setRequired(false)),
  new SlashCommandBuilder()
    .setName("advise").setDescription("Get advice for an assignee's tasks")
    .addStringOption(o => o.setName("assignee").setDescription("Assignee name").setRequired(true)),
  new SlashCommandBuilder()
    .setName("weekprogress").setDescription("Show tasks created this week"),
  new SlashCommandBuilder()
    .setName("weekadvise").setDescription("Advice for tasks due this week"),
  new SlashCommandBuilder()
    .setName("listassignees").setDescription("Show top 10 assignees"),
  new SlashCommandBuilder()
    .setName("liststatus").setDescription("Show top 10 status values"),
].map(c => c.toJSON());

async function registerCommands() {
  await new REST({ version: '10' })
    .setToken(DISCORD_TOKEN)
    .put(Routes.applicationGuildCommands(client.application!.id, "1314144873917579334"), { body: commands });
  console.log('✅ Commands registered');
}

client.once('ready', async () => {
  await registerCommands();
  console.log(`✅ Bot ready: ${client.user?.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction as ChatInputCommandInteraction;
  
  // Setup commands are handled separately
  if (['setup', 'config', 'reset'].includes(cmd.commandName)) {
    try {
      await handleSetupCommand(cmd, configManager);
    } catch (e) {
      console.error('❌ 設定コマンドエラー:', e);
      await cmd.reply({
        content: '⚠️ 設定コマンド実行中にエラーが発生しました。時間をおいて再度お試しください。',
        ephemeral: true
      });
    }
    return;
  }

  // Check if configuration is complete
  const guildId = cmd.guildId!;
  let isConfigComplete = false;
  try {
    isConfigComplete = await configManager.isConfigComplete(guildId);
  } catch (e) {
    console.error('❌ 設定確認エラー:', e);
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

  // Get user configuration
  let userConfig;
  try {
    userConfig = await configManager.getConfig(guildId);
    if (!userConfig) throw new Error('設定が見つかりません');
  } catch (e) {
    console.error('❌ 設定取得エラー:', e);
    await cmd.editReply('⚠️ 設定の取得中にエラーが発生しました。再度`/setup`コマンドで設定してください。');
    return;
  }

  const notion = new NotionClient({ auth: userConfig.notionToken });
  const openai = new OpenAI({ apiKey: userConfig.openaiApiKey || OPENAI_API_KEY });

  try {
    switch (cmd.commandName) {
      case 'addtask': {
        const content = cmd.options.getString('content', true);
        await notion.pages.create({ 
          parent: { database_id: userConfig.notionDatabaseId }, 
          properties: { 'タスク名': { title: [{ text: { content } }] } } 
        });
        await cmd.editReply('✅ Task added.');
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
        const ai = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: `Tasks for ${assignee}:\n${prompt}\nAs a project manager, provide action items:` }] });
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
        const ai = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: `Tasks due this week:\n${prompt}\nAs a PM, suggest next steps:` }] });
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
    console.error(`❌ コマンド(${cmd.commandName})実行エラー:`, e);
    await cmd.editReply('⚠️ コマンド実行中に予期せぬエラーが発生しました。内容を確認のうえ、再度お試しください。');
  }
});

client.login(DISCORD_TOKEN);
