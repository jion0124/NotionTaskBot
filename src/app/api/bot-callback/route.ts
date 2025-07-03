import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, guild_id, guild_name, bot_client_id } = body;
    const botId = process.env.NEXT_PUBLIC_BOT_CLIENT_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botId || !botToken) {
      return NextResponse.json({ error: 'BotのIDまたはトークンが未設定です。' }, { status: 500 });
    }
    if (!guild_id) {
      return NextResponse.json({ error: 'guild_idが未指定です。' }, { status: 400 });
    }
    // クッキーからdiscord_user_idを取得
    const cookies = request.headers.get('cookie');
    let discordUserId = null;
    if (cookies) {
      const cookiePairs = cookies.split(';').map(pair => {
        const [key, value] = pair.trim().split('=');
        return [key, value];
      }).filter(([key, value]) => key && value);
      const cookieMap = new Map(cookiePairs as [string, string][]);
      discordUserId = cookieMap.get('discord_user_id');
    }
    if (!discordUserId) {
      return NextResponse.json({ error: 'discord_user_idが見つかりません。再度ログインしてください。' }, { status: 401 });
    }
    // Discord APIでBotがサーバーにいるか確認
    const botRes = await fetch(`https://discord.com/api/v10/guilds/${guild_id}/members/${botId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });
    if (!botRes.ok) {
      return NextResponse.json({ error: 'Botがサーバーに追加されていません。認証画面で「Botを追加」にチェックが入っているか、権限が十分か確認してください。' }, { status: 400 });
    }
    // DB登録
    const { error } = await supabase.from('guilds').upsert({
      guild_id,
      guild_name: guild_name || 'Unknown Guild',
      bot_client_id: bot_client_id || botId,
      discord_user_id: discordUserId,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: 'DB登録に失敗しました: ' + error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 