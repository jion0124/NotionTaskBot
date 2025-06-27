// 包括的なエラーハンドリングシステム
export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  userAgent?: string;
  url?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
  retryable?: boolean;
}

export class AppError extends Error {
  public code: string;
  public details?: any;
  public retryable: boolean;
  public timestamp: string;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    details?: any,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
    this.timestamp = new Date().toISOString();
  }
}

// エラーコード定義
export const ERROR_CODES = {
  // 認証関連
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED_TOKEN: 'AUTH_EXPIRED_TOKEN',
  AUTH_INVALID_CODE: 'AUTH_INVALID_CODE',
  AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
  AUTH_DISCORD_ERROR: 'AUTH_DISCORD_ERROR',
  
  // Discord API関連
  DISCORD_API_ERROR: 'DISCORD_API_ERROR',
  DISCORD_RATE_LIMIT: 'DISCORD_RATE_LIMIT',
  DISCORD_PERMISSION_DENIED: 'DISCORD_PERMISSION_DENIED',
  DISCORD_GUILD_NOT_FOUND: 'DISCORD_GUILD_NOT_FOUND',
  
  // Supabase関連
  SUPABASE_CONNECTION_ERROR: 'SUPABASE_CONNECTION_ERROR',
  SUPABASE_QUERY_ERROR: 'SUPABASE_QUERY_ERROR',
  SUPABASE_AUTH_ERROR: 'SUPABASE_AUTH_ERROR',
  
  // Notion関連
  NOTION_API_ERROR: 'NOTION_API_ERROR',
  NOTION_INVALID_KEY: 'NOTION_INVALID_KEY',
  NOTION_DATABASE_NOT_FOUND: 'NOTION_DATABASE_NOT_FOUND',
  NOTION_NOT_CONFIGURED: 'NOTION_NOT_CONFIGURED',
  NOTION_NETWORK_ERROR: 'NOTION_NETWORK_ERROR',
  
  // ネットワーク関連
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // バリデーション関連
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // システム関連
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// エラーメッセージ定義
export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID_TOKEN]: 'アクセストークンが無効です。再度ログインしてください。',
  [ERROR_CODES.AUTH_EXPIRED_TOKEN]: 'セッションが期限切れです。再度ログインしてください。',
  [ERROR_CODES.AUTH_INVALID_CODE]: '認証コードが無効です。ブラウザのキャッシュをクリアして再試行してください。',
  [ERROR_CODES.AUTH_RATE_LIMIT]: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  [ERROR_CODES.AUTH_DISCORD_ERROR]: 'Discord認証でエラーが発生しました。',
  
  [ERROR_CODES.DISCORD_API_ERROR]: 'Discord APIでエラーが発生しました。',
  [ERROR_CODES.DISCORD_RATE_LIMIT]: 'Discord API レート制限に達しました。しばらく待ってから再試行してください。',
  [ERROR_CODES.DISCORD_PERMISSION_DENIED]: 'Discordサーバーへのアクセス権限がありません。',
  [ERROR_CODES.DISCORD_GUILD_NOT_FOUND]: 'Discordサーバーが見つかりません。',
  
  [ERROR_CODES.SUPABASE_CONNECTION_ERROR]: 'データベース接続エラーが発生しました。',
  [ERROR_CODES.SUPABASE_QUERY_ERROR]: 'データベースクエリでエラーが発生しました。',
  [ERROR_CODES.SUPABASE_AUTH_ERROR]: 'データベース認証でエラーが発生しました。',
  
  [ERROR_CODES.NOTION_API_ERROR]: 'Notion APIでエラーが発生しました。',
  [ERROR_CODES.NOTION_INVALID_KEY]: 'Notion APIキーが無効です。',
  [ERROR_CODES.NOTION_DATABASE_NOT_FOUND]: 'Notionデータベースが見つかりません。',
  [ERROR_CODES.NOTION_NOT_CONFIGURED]: 'Notion設定が完了していません。',
  
  [ERROR_CODES.NETWORK_ERROR]: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
  [ERROR_CODES.TIMEOUT_ERROR]: 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。',
  
  [ERROR_CODES.VALIDATION_ERROR]: '入力データが無効です。',
  [ERROR_CODES.INVALID_INPUT]: '入力内容を確認してください。',
  
  [ERROR_CODES.CONFIGURATION_ERROR]: '設定エラーが発生しました。管理者にお問い合わせください。',
  [ERROR_CODES.UNKNOWN_ERROR]: '予期しないエラーが発生しました。',
} as const;

// エラーログ管理
class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorInfo[] = [];
  private maxLogs = 100;

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  log(error: Error | AppError, context?: any): void {
    const errorInfo: ErrorInfo = {
      code: error instanceof AppError ? error.code : ERROR_CODES.UNKNOWN_ERROR,
      message: error.message,
      details: error instanceof AppError ? error.details : undefined,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };

    // ログに追加
    this.logs.push(errorInfo);
    
    // 最大ログ数を超えた場合、古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // コンソールに出力（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo);
    }

    // 本番環境では外部ログサービスに送信
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorInfo);
    }
  }

  private async sendToExternalService(errorInfo: ErrorInfo): Promise<void> {
    try {
      // 外部ログサービスへの送信処理
      // 例: Sentry, LogRocket, カスタムAPIなど
      await fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorInfo),
      });
    } catch (err) {
      // 外部ログサービスへの送信に失敗しても、アプリケーションは継続
      console.warn('Failed to send error to external service:', err);
    }
  }

  getLogs(): ErrorInfo[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

// エラーハンドリングユーティリティ
export const errorHandler = {
  // エラーを作成
  createError(
    message: string,
    code: keyof typeof ERROR_CODES = 'UNKNOWN_ERROR',
    details?: any,
    retryable: boolean = false
  ): AppError {
    return new AppError(message, ERROR_CODES[code], details, retryable);
  },

  // エラーをログに記録
  logError(error: Error | AppError, context?: any): void {
    ErrorLogger.getInstance().log(error, context);
  },

  // エラーレスポンスを作成
  createErrorResponse(error: Error | AppError): ErrorResponse {
    const appError = error instanceof AppError ? error : this.createError(error.message);
    
    return {
      success: false,
      error: ERROR_MESSAGES[appError.code as keyof typeof ERROR_MESSAGES] || appError.message,
      code: appError.code,
      details: appError.details,
      retryable: appError.retryable,
    };
  },

  // 非同期関数のエラーハンドリング
  async handleAsync<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<{ success: true; data: T } | { success: false; error: string; retryable?: boolean }> {
    try {
      const data = await fn();
      return { success: true, data };
    } catch (error) {
      const appError = error instanceof AppError ? error : this.createError(
        error instanceof Error ? error.message : 'Unknown error',
        'UNKNOWN_ERROR'
      );
      
      this.logError(appError, context);
      
      return {
        success: false,
        error: ERROR_MESSAGES[appError.code as keyof typeof ERROR_MESSAGES] || appError.message,
        retryable: appError.retryable,
      };
    }
  },

  // リトライ機能付き非同期関数
  async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // リトライ可能なエラーかチェック
        if (error instanceof AppError && !error.retryable) {
          throw error;
        }

        // レート制限エラーの場合は特別な処理
        if (this.isRateLimitError(error)) {
          const retryAfter = error instanceof AppError && error.details?.retryAfter;
          if (retryAfter) {
            // 開発環境ではより短い待機時間
            const actualWaitTime = process.env.NODE_ENV === 'development' ? Math.min(retryAfter, 1000) : retryAfter;
            await new Promise(resolve => setTimeout(resolve, actualWaitTime));
            continue;
          }
        }

        // 指数バックオフで待機（開発環境ではより短い遅延）
        const baseDelay = process.env.NODE_ENV === 'development' ? Math.min(delay, 500) : delay;
        const waitTime = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError!;
  },

  // バリデーションエラーを作成
  createValidationError(field: string, message: string): AppError {
    return this.createError(
      `${field}: ${message}`,
      'VALIDATION_ERROR',
      { field, message },
      false
    );
  },

  // ネットワークエラーをチェック
  isNetworkError(error: any): boolean {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.message?.includes('fetch') ||
      error.message?.includes('network') ||
      error.message?.includes('connection')
    );
  },

  // レート制限エラーをチェック
  isRateLimitError(error: any): boolean {
    return (
      error.code === 'DISCORD_RATE_LIMIT' ||
      error.code === 'AUTH_RATE_LIMIT' ||
      error.message?.includes('rate limit') ||
      error.message?.includes('429')
    );
  },

  // 認証エラーをチェック
  isAuthError(error: any): boolean {
    return (
      error.code === 'AUTH_INVALID_TOKEN' ||
      error.code === 'AUTH_EXPIRED_TOKEN' ||
      error.code === 'AUTH_INVALID_CODE' ||
      error.message?.includes('401') ||
      error.message?.includes('unauthorized')
    );
  },
};

// グローバルエラーハンドラー
export function setupGlobalErrorHandler(): void {
  if (typeof window !== 'undefined') {
    // 未処理のPromiseエラー
    window.addEventListener('unhandledrejection', (event) => {
      event.preventDefault();
      errorHandler.logError(new Error(event.reason), 'unhandledrejection');
    });

    // 未処理のJavaScriptエラー
    window.addEventListener('error', (event) => {
      event.preventDefault();
      errorHandler.logError(new Error(event.message), 'global-error');
    });
  }
}

// React Error Boundary用のエラーハンドラー
export function handleReactError(error: Error, errorInfo: any): void {
  errorHandler.logError(error, {
    ...errorInfo,
    type: 'react-error-boundary',
  });
} 