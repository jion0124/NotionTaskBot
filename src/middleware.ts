import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { apiRateLimit, botApiRateLimit } from './lib/rate-limiter';

// セキュリティヘッダーの設定
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://discord.com https://cdn.discordapp.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://discord.com https://api.notion.com https://api.openai.com https://*.supabase.co",
    "frame-src https://discord.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// 許可されたオリジンの設定
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://your-domain.com', // 本番ドメインに変更
];

// CORS設定
function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // セキュリティヘッダーの追加
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // CORS設定
  const origin = request.headers.get('origin') || '';
  Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // OPTIONSリクエストの処理
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers: response.headers });
  }

  // APIルートの保護
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Bot APIエンドポイントの認証チェック
    if (request.nextUrl.pathname.startsWith('/api/bot/')) {
      if (!validateBotAuth(request)) {
        return NextResponse.json(
          { success: false, error: '認証に失敗しました' },
          { status: 401, headers: response.headers }
        );
      }

      // Bot API用のレート制限
      const rateLimitResponse = await botApiRateLimit(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    } else {
      // 通常のAPI用のレート制限
      const rateLimitResponse = await apiRateLimit(request);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    // ヘルスチェックエンドポイントは除外
    if (request.nextUrl.pathname === '/api/health') {
      return response;
    }

    // その他のAPIエンドポイントの保護
    const userAgent = request.headers.get('user-agent') || '';
    const isBot = /bot|crawler|spider|crawling/i.test(userAgent);
    
    if (isBot && !request.nextUrl.pathname.startsWith('/api/health')) {
      return NextResponse.json(
        { success: false, error: 'Botアクセスは許可されていません' },
        { status: 403, headers: response.headers }
      );
    }
  }

  // 本番環境でのHTTPS強制
  if (process.env.NODE_ENV === 'production') {
    const hostname = request.headers.get('host') || '';
    const isHttps = request.headers.get('x-forwarded-proto') === 'https';
    
    if (!isHttps && !hostname.includes('localhost')) {
      const httpsUrl = request.nextUrl.clone();
      httpsUrl.protocol = 'https:';
      return NextResponse.redirect(httpsUrl, 301);
    }
  }

  // セキュリティログ（本番環境のみ）
  if (process.env.NODE_ENV === 'production') {
    const clientIp = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    
    // 疑わしいアクセスのログ
    if (request.method === 'POST' && request.nextUrl.pathname.includes('/api/')) {
      console.log(`[SECURITY] API Access: ${request.method} ${request.nextUrl.pathname} from ${clientIp}`);
    }
  }

  return response;
}

// ミドルウェアを適用するパス
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}; 