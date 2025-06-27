import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getDiscordUser } from '@/lib/discord';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    console.error('No authorization code provided');
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${encodeURIComponent('認証コードがありません')}`);
  }

  try {
    console.log('Processing OAuth callback with code:', code.substring(0, 10) + '...');
    
    // Discordのアクセストークン取得
    const tokenData = await exchangeCodeForToken(code);
    console.log('Token exchange successful');
    
    // Discordユーザー情報取得
    const user = await getDiscordUser(tokenData.access_token);
    console.log('User info retrieved:', user.username);

    // セッション情報をクッキーに保存
    const response = NextResponse.redirect(
      state
        ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?state=${encodeURIComponent(state)}`
        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );

    // セッション情報をクッキーに保存（修正版）
    response.cookies.set('discord_access_token', tokenData.access_token, {
      httpOnly: false, // フロントエンドでもアクセス可能
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日
    });

    response.cookies.set('discord_user_id', user.id, {
      httpOnly: false, // フロントエンドでもアクセス可能
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日
    });

    response.cookies.set('discord_username', user.username, {
      httpOnly: false, // フロントエンドでも使用可能
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7日
    });

    console.log('Authentication successful, redirecting to dashboard');
    return response;
  } catch (e: any) {
    console.error('OAuth callback error:', e);
    
    let errorMessage = '認証エラーが発生しました';
    if (e.message) {
      errorMessage = e.message;
    } else if (e.code) {
      errorMessage = `認証エラー (${e.code})`;
    }
    
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/auth/login?error=${encodeURIComponent(errorMessage)}`);
  }
} 