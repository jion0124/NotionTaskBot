import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/guilds - guildsテーブル一覧取得
export async function GET() {
  const { data, error } = await supabase.from('guilds').select('*');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/guilds - guildsテーブルにupsert
export async function POST(request: NextRequest) {
  try {
    // クッキーからユーザーIDを直接取得
    const cookies = request.headers.get('cookie');
    if (!cookies) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const cookiePairs = cookies.split(';').map(pair => {
      const [key, value] = pair.trim().split('=');
      return [key, value];
    }).filter(([key, value]) => key && value);
    
    const cookieMap = new Map(cookiePairs as [string, string][]);
    const discordUserId = cookieMap.get('discord_user_id');

    if (!discordUserId) {
      return NextResponse.json({ error: '有効なセッションが見つかりません' }, { status: 401 });
    }

    const body = await request.json();
    console.log('POST /api/guilds body:', body);

    // 入力検証
    if (!body.guild_id || typeof body.guild_id !== 'string') {
      return NextResponse.json({ error: 'guild_idは必須です' }, { status: 400 });
    }

    // 既存レコード取得
    const { data: existing, error: fetchError } = await supabase
      .from('guilds')
      .select('*')
      .eq('guild_id', body.guild_id)
      .single();

    const upsertData = {
      guild_id: body.guild_id,
      guild_name: body.guild_name || existing?.guild_name || 'Unknown Guild',
      bot_client_id: body.bot_client_id || existing?.bot_client_id || '',
      discord_user_id: discordUserId, // クッキーから取得したユーザーIDを使用
      notion_api_key: body.notion_api_key || existing?.notion_api_key || null,
      notion_database_id: body.notion_database_id || existing?.notion_database_id || null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existing) {
      // UPDATE
      ({ error } = await supabase
        .from('guilds')
        .update(upsertData)
        .eq('guild_id', body.guild_id));
    } else {
      // INSERT
      ({ error } = await supabase
        .from('guilds')
        .insert([upsertData]));
    }

    if (error) {
      console.error('Supabase upsert error:', error, 'body:', body);
      return NextResponse.json({ error: error.message, body }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('API /api/guilds POST catch error:', e);
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
} 