import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  
  if (!clientId) {
    console.error('Discord Client ID is not configured');
    return NextResponse.json({ error: 'Discord Client IDが設定されていません' }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  
  return NextResponse.json({ url: authUrl });
}
