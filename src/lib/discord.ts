import { errorHandler, AppError, ERROR_CODES } from './error-handler';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

// 動的にリダイレクトURIを設定
function getRedirectUri(): string {
  if (!process.env.NEXT_PUBLIC_REDIRECT_URI) {
    throw new Error('NEXT_PUBLIC_REDIRECT_URIが未設定です');
  }
  return process.env.NEXT_PUBLIC_REDIRECT_URI;
}

const REDIRECT_URI = getRedirectUri();

// ※NEXT_PUBLIC_APP_URLが未設定の場合は3000番ポートがデフォルト

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}> {
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw errorHandler.createError(
      'Discord credentials are not configured',
      'CONFIGURATION_ERROR'
    );
  }

  console.log('Discord OAuth2 Token Exchange Debug Info:');
  console.log('- Client ID:', DISCORD_CLIENT_ID);
  console.log('- Redirect URI:', REDIRECT_URI);
  console.log('- Code:', code);
  console.log('- Code length:', code.length);
  console.log('- Client Secret exists:', !!DISCORD_CLIENT_SECRET);
  console.log('- Current timestamp:', new Date().toISOString());

  // 認証コードの基本的な検証
  if (!code || code.length < 10) {
    throw errorHandler.createError(
      'Invalid authorization code format',
      'AUTH_INVALID_CODE'
    );
  }

  const requestBody = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  console.log('- Request body (without secret):', requestBody.toString().replace(DISCORD_CLIENT_SECRET, '[HIDDEN]'));
  console.log('- Request URL:', 'https://discord.com/api/oauth2/token');

  try {
    const response = await errorHandler.retry(
      async () => {
        const res = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: requestBody,
        });

        console.log('- Response status:', res.status);
        console.log('- Response status text:', res.statusText);
        console.log('- Response headers:', Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
          const errorText = await res.text();
          console.log('- Error response body:', errorText);
          
          let errorJson;
          
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            throw errorHandler.createError(
              `Failed to exchange code for token. Status: ${res.status}, Response: ${errorText}`,
              'AUTH_DISCORD_ERROR',
              { status: res.status, response: errorText },
              false
            );
          }

          // より詳細なエラーメッセージを提供
          if (errorJson.error === 'invalid_grant') {
            const suggestions = [
              '認証コードが期限切れです（通常10分以内）',
              '認証コードが既に使用されています',
              'リダイレクトURIがDiscord Developer Portalの設定と一致していません',
              'ブラウザのキャッシュをクリアして再試行してください'
            ];
            
            throw errorHandler.createError(
              `Discord OAuth2 invalid_grant error: ${errorJson.error_description}. 考えられる原因: ${suggestions.join(', ')}`,
              'AUTH_INVALID_CODE',
              { discordError: errorJson, suggestions },
              false
            );
          }
          
          throw errorHandler.createError(
            `Discord OAuth2 error: ${errorJson.error} - ${errorJson.error_description || 'Unknown error'}`,
            'AUTH_DISCORD_ERROR',
            { discordError: errorJson },
            false
          );
        }

        return res;
      },
      3, // maxRetries
      1000, // delay
      'discord-token-exchange'
    );

    const tokenData = await response.json();
    console.log('- Token exchange successful');
    return tokenData;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // ネットワークエラーの場合
    if (errorHandler.isNetworkError(error)) {
      throw errorHandler.createError(
        'Discord APIへの接続に失敗しました',
        'NETWORK_ERROR',
        { originalError: error },
        true
      );
    }
    
    throw errorHandler.createError(
      'Discord認証でエラーが発生しました',
      'AUTH_DISCORD_ERROR',
      { originalError: error },
      false
    );
  }
}

export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
}> {
  try {
    const response = await errorHandler.retry(
      async () => {
        const res = await fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw errorHandler.createError(
              'アクセストークンが無効です。再度ログインしてください。',
              'AUTH_INVALID_TOKEN',
              { status: res.status },
              false
            );
          }
          
          throw errorHandler.createError(
            `Discordユーザー情報の取得に失敗しました: ${res.status} ${res.statusText}`,
            'DISCORD_API_ERROR',
            { status: res.status, statusText: res.statusText },
            true
          );
        }

        return res;
      },
      3,
      1000,
      'discord-user-fetch'
    );

    return response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw errorHandler.createError(
      'Discordユーザー情報の取得に失敗しました',
      'DISCORD_API_ERROR',
      { originalError: error },
      true
    );
  }
}

export async function getDiscordGuilds(accessToken: string): Promise<Array<{
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}>> {
  try {
    const response = await errorHandler.retry(
      async () => {
        const res = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw errorHandler.createError(
              'アクセストークンが無効です。再度ログインしてください。',
              'AUTH_INVALID_TOKEN',
              { status: res.status },
              false
            );
          }
          
          if (res.status === 429) {
            const retryAfter = res.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
            
            // 開発環境ではより短い待機時間
            const actualWaitTime = process.env.NODE_ENV === 'development' ? Math.min(waitTime, 1000) : waitTime;
            
            throw errorHandler.createError(
              `Discord API レート制限: ${Math.ceil(actualWaitTime / 1000)}秒後に自動再試行します...`,
              'DISCORD_RATE_LIMIT',
              { retryAfter: actualWaitTime },
              true
            );
          }
          
          throw errorHandler.createError(
            `Discordサーバーの取得に失敗しました: ${res.status} ${res.statusText}`,
            'DISCORD_API_ERROR',
            { status: res.status, statusText: res.statusText },
            true
          );
        }

        return res;
      },
      3, // maxRetries
      process.env.NODE_ENV === 'development' ? 500 : 1000, // 開発環境ではより短い遅延
      'discord-guilds-fetch'
    );

    return response.json();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw errorHandler.createError(
      'Discordサーバーの取得に失敗しました',
      'DISCORD_API_ERROR',
      { originalError: error },
      true
    );
  }
}

export function generateBotInviteUrl(clientId: string, guildId?: string): string {
  if (!clientId) {
    throw errorHandler.createError(
      'Bot Client ID is required',
      'VALIDATION_ERROR'
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    permissions: '2147483648', // Administrator permission
    scope: 'bot',
    ...(guildId && { guild_id: guildId }),
  });

  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
} 