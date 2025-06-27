// 環境変数の管理と検証
export class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: Record<string, string | undefined>;

  private constructor() {
    this.config = {
      // Discord設定
      DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
      NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID,
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
      
      // Supabase設定
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      
      // OpenAI設定
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      
      // Bot API認証
      BOT_API_SECRET: process.env.BOT_API_SECRET,
      
      // アプリケーション設定
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI,
      
      // 暗号化設定
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
      NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: process.env.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,
    };
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  // 必須環境変数の検証
  validateRequired(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const required = [
      'DISCORD_BOT_TOKEN',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'BOT_API_SECRET',
    ];

    for (const key of required) {
      if (!this.config[key]) {
        errors.push(`${key} が設定されていません`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 開発環境での警告
  validateDevelopment(): { warnings: string[] } {
    const warnings: string[] = [];
    
    if (process.env.NODE_ENV === 'development') {
      if (!this.config.OPENAI_API_KEY) {
        warnings.push('OPENAI_API_KEY が設定されていません（AI機能が制限されます）');
      }
      if (!this.config.ENCRYPTION_KEY) {
        warnings.push('ENCRYPTION_KEY が設定されていません（セッション暗号化が無効です）');
      }
    }

    return { warnings };
  }

  // 環境変数の取得（型安全）
  get(key: string): string | undefined {
    return this.config[key];
  }

  // 必須環境変数の取得（エラー付き）
  getRequired(key: string): string {
    const value = this.config[key];
    if (!value) {
      throw new Error(`必須環境変数 ${key} が設定されていません`);
    }
    return value;
  }

  // 本番環境かどうかの判定
  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  // 開発環境かどうかの判定
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  // 環境変数の一覧表示（機密情報は隠す）
  getConfigSummary(): Record<string, string> {
    const summary: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(this.config)) {
      if (value) {
        if (key.includes('TOKEN') || key.includes('KEY') || key.includes('SECRET')) {
          summary[key] = `${value.substring(0, 8)}...`;
        } else {
          summary[key] = value;
        }
      } else {
        summary[key] = '未設定';
      }
    }
    
    return summary;
  }
}

// シングルトンインスタンス
export const envConfig = EnvironmentConfig.getInstance(); 