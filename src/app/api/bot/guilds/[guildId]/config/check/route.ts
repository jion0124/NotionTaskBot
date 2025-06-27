import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Bot API認証の検証
function validateBotAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.BOT_API_SECRET;
  
  if (!expectedSecret) {
    console.error('❌ BOT_API_SECRETが設定されていません');
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ 認証ヘッダーが不正です');
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === expectedSecret;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { guildId: string } }
) {
  try {
    // Bot認証の検証
    if (!validateBotAuth(request)) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const { guildId } = params;

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: 'guildIdが必要です' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    // 設定の確認
    const { data, error } = await supabase
      .from('guilds')
      .select('notion_api_key, notion_database_id')
      .eq('guild_id', guildId)
      .single();

    if (error) {
      console.error('❌ 設定確認エラー:', error);
      return NextResponse.json(
        { success: false, error: '設定の確認に失敗しました' },
        { status: 500 }
      );
    }

    const isComplete = !!(data?.notion_api_key && data?.notion_database_id);

    return NextResponse.json({
      success: true,
      data: {
        isComplete,
        guildId,
        hasNotionKey: !!data?.notion_api_key,
        hasDatabaseId: !!data?.notion_database_id,
      }
    });

  } catch (error) {
    console.error('❌ 設定確認APIエラー:', error);
    return NextResponse.json(
      { success: false, error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
} 