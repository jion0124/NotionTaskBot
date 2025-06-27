import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { guildIds } = await request.json();

    if (!guildIds || !Array.isArray(guildIds)) {
      return NextResponse.json(
        { error: 'guildIds配列が必要です' },
        { status: 400 }
      );
    }

    // SupabaseからBotが追加されているサーバーを取得
    const { data: guildsWithBot, error } = await supabase
      .from('guilds')
      .select('guild_id, guild_name, bot_client_id, notion_api_key, notion_database_id')
      .in('guild_id', guildIds)
      .not('bot_client_id', 'is', null);

    if (error) {
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      );
    }

    // Botが追加されているサーバーIDのセットを作成
    const guildsWithBotSet = new Set(guildsWithBot.map(guild => guild.guild_id));
    
    // 各サーバーのBot追加状況を判定
    const botStatus = guildIds.map(guildId => ({
      guildId,
      hasBot: guildsWithBotSet.has(guildId),
      guildInfo: guildsWithBot.find(guild => guild.guild_id === guildId) || null
    }));

    return NextResponse.json({
      success: true,
      botStatus
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
} 