import { REST, Routes } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN as string;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID
  || process.env.NEXT_PUBLIC_BOT_CLIENT_ID
  || process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

if (!CLIENT_ID) {
  throw new Error('DISCORD_CLIENT_IDが見つかりません。envファイルを確認してください。');
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log("全コマンド削除中...");
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log("✅ 全コマンド削除完了");
  } catch (error) {
    console.error(error);
  }
})(); 