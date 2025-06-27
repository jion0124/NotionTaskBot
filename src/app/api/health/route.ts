import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { envConfig } from '@/lib/environment-config';

// Supabaseクライアントの初期化
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 基本的なヘルスチェック
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database: 'unknown',
        discord: 'unknown',
        notion: 'unknown',
        openai: 'unknown',
      }
    };

    // データベース接続チェック
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('guilds')
          .select('count')
          .limit(1);
        
        if (error) {
          healthStatus.checks.database = 'error';
          healthStatus.status = 'degraded';
        } else {
          healthStatus.checks.database = 'healthy';
        }
      } catch (error) {
        healthStatus.checks.database = 'error';
        healthStatus.status = 'degraded';
      }
    } else {
      healthStatus.checks.database = 'not_configured';
    }

    // Discord設定チェック
    const discordToken = process.env.DISCORD_BOT_TOKEN;
    if (discordToken) {
      healthStatus.checks.discord = 'configured';
    } else {
      healthStatus.checks.discord = 'not_configured';
      healthStatus.status = 'degraded';
    }

    // Notion設定チェック
    const notionToken = process.env.NOTION_TOKEN;
    if (notionToken) {
      healthStatus.checks.notion = 'configured';
    } else {
      healthStatus.checks.notion = 'not_configured';
    }

    // OpenAI設定チェック
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      healthStatus.checks.openai = 'configured';
    } else {
      healthStatus.checks.openai = 'not_configured';
    }

    // レスポンス時間の計算
    const responseTime = Date.now() - startTime;

    // ステータスコードの決定
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    return NextResponse.json({ ...healthStatus, response_time: responseTime }, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error',
      response_time: `${Date.now() - startTime}ms`,
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  }
} 