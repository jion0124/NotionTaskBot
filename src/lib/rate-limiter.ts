// メモリベースのレート制限機能
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // 1時間ごとにクリーンアップ
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 60 * 1000);
  }

  // レート制限のチェック
  checkLimit(key: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    // 開発環境ではレート制限を無効化
    if (process.env.NODE_ENV === 'development') {
      return {
        allowed: true,
        remaining: 999999,
        resetTime: Date.now() + windowMs,
      };
    }

    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // 新しいウィンドウまたは期限切れ
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: now + windowMs,
      };
    }

    if (entry.count >= limit) {
      // 制限に達している
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // カウントを増やす
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // クリーンアップ（期限切れのエントリを削除）
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  // リソースの解放
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.limits.clear();
  }
}

// シングルトンインスタンス
export const rateLimiter = new RateLimiter();

// レート制限ミドルウェア
export function createRateLimitMiddleware(
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000, // 15分
  keyGenerator?: (request: Request) => string
) {
  return async function rateLimitMiddleware(request: Request): Promise<Response | null> {
    // 開発環境ではレート制限をスキップ
    if (process.env.NODE_ENV === 'development') {
      return null;
    }

    const key = keyGenerator ? keyGenerator(request) : 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown';

    const result = rateLimiter.checkLimit(key, limit, windowMs);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'レート制限に達しました。しばらく時間をおいてから再試行してください。',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // レスポンスヘッダーにレート制限情報を追加
    const response = new Response();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

    return null; // 続行
  };
}

// デフォルトのレート制限設定
export const defaultRateLimit = createRateLimitMiddleware(100, 15 * 60 * 1000);

// API用の厳しいレート制限
export const apiRateLimit = createRateLimitMiddleware(50, 15 * 60 * 1000);

// Bot API用の緩いレート制限
export const botApiRateLimit = createRateLimitMiddleware(200, 15 * 60 * 1000); 