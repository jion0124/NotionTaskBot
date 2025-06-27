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

// 設定の取得
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

    // 設定の取得
    const { data, error } = await supabase
      .from('guilds')
      .select('notion_api_key, notion_database_id')
      .eq('guild_id', guildId)
      .single();

    if (error) {
      console.error('❌ 設定取得エラー:', error);
      return NextResponse.json(
        { success: false, error: '設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: '設定が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notion_api_key: data.notion_api_key,
        notion_database_id: data.notion_database_id,
      }
    });

  } catch (error) {
    console.error('❌ 設定取得APIエラー:', error);
    return NextResponse.json(
      { success: false, error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}

// 設定の更新
export async function PUT(
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
    const body = await request.json();
    const { notion_api_key, notion_database_id } = body;

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: 'guildIdが必要です' },
        { status: 400 }
      );
    }

    if (!notion_api_key || !notion_database_id) {
      return NextResponse.json(
        { success: false, error: 'notion_api_keyとnotion_database_idが必要です' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'データベース接続エラー' },
        { status: 500 }
      );
    }

    // 設定の更新
    const { error } = await supabase
      .from('guilds')
      .upsert({
        guild_id: guildId,
        notion_api_key,
        notion_database_id,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ 設定更新エラー:', error);
      return NextResponse.json(
        { success: false, error: '設定の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: '設定を更新しました' }
    });

  } catch (error) {
    console.error('❌ 設定更新APIエラー:', error);
    return NextResponse.json(
      { success: false, error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
}

// 設定の削除（リセット）
export async function DELETE(
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

    // 設定のリセット
    const { error } = await supabase
      .from('guilds')
      .update({
        notion_api_key: null,
        notion_database_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('guild_id', guildId);

    if (error) {
      console.error('❌ 設定リセットエラー:', error);
      return NextResponse.json(
        { success: false, error: '設定のリセットに失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: '設定をリセットしました' }
    });

  } catch (error) {
    console.error('❌ 設定リセットAPIエラー:', error);
    return NextResponse.json(
      { success: false, error: '内部サーバーエラー' },
      { status: 500 }
    );
  }
} 