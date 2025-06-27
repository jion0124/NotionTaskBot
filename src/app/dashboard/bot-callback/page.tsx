"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Bot, Database, Settings, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';
import { useCookie } from '@/hooks/useCookie';

export default function BotCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const guildId = searchParams.get('state');
  const { getCookie, deleteCookie } = useCookie();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const checkAndRegister = async () => {
      if (!guildId) {
        setStatus('error');
        setError('Guild IDが見つかりません');
        return;
      }

      setStatus('checking');
      setError(null);
      
      try {
        // プログレスバーのシミュレーション
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);
        
        // セッション情報取得
        setProgress(20);
        
        // クッキーからアクセストークンを取得
        const accessToken = getCookie('discord_access_token');
        if (!accessToken) {
          throw new Error('認証情報が見つかりません。再度ログインしてください。');
        }
        
        // アクセストークンの有効性を確認
        setProgress(30);
        try {
          const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (userRes.status === 401) {
            throw new Error('アクセストークンが無効です。再度ログインしてください。');
          }
          
          if (!userRes.ok) {
            throw new Error(`ユーザー情報の取得に失敗しました (${userRes.status})`);
          }
          
          const userData = await userRes.json();
        } catch (userError) {
          throw new Error(`認証エラー: ${userError instanceof Error ? userError.message : '不明なエラー'}`);
        }
        
        // Discord APIでサーバー情報を取得
        setProgress(40);
        
        // ユーザーが参加しているサーバー一覧を取得
        let retryCount = 0;
        let userGuildsRes;
        
        while (retryCount < 3) {
          try {
            userGuildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            
            if (userGuildsRes.status === 429) {
              const retryAfter = userGuildsRes.headers.get('Retry-After');
              const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
              retryCount++;
              if (retryCount >= 3) {
                throw new Error('DiscordのAPI制限に達しました。しばらく待ってから再度お試しください。');
              }
              await new Promise(res => setTimeout(res, waitMs));
              continue;
            }
            
            if (!userGuildsRes.ok) {
              throw new Error(`ユーザーのサーバー一覧取得に失敗しました (${userGuildsRes.status})`);
            }
            
            break; // 成功したらループを抜ける
          } catch (err) {
            retryCount++;
            if (retryCount >= 3) {
              throw err;
            }
            await new Promise(res => setTimeout(res, 1000));
          }
        }
        
        const userGuilds = await userGuildsRes!.json();
        
        // 該当するサーバーを検索
        const targetGuild = userGuilds.find((guild: any) => guild.id === guildId);
        
        if (!targetGuild) {
          throw new Error(`サーバーID ${guildId} のサーバーに参加していません。Botを追加するには、まずサーバーに参加する必要があります。`);
        }
        
        setGuildName(targetGuild.name);
        
        // 管理者権限があるかチェック
        const permissions = BigInt(targetGuild.permissions);
        const hasAdminPermission = (permissions & BigInt(0x8)) === BigInt(0x8); // ADMINISTRATOR permission
        
        if (!hasAdminPermission) {
          throw new Error('このサーバーで管理者権限がありません。Botを追加するには管理者権限が必要です。');
        }
        
        // Bot確認は削除（Botが追加される前なので確認できない）
        setProgress(70);
        
        // DBに登録
        setProgress(85);
        const saveRes = await fetch('/api/guilds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: guildId,
            guild_name: targetGuild.name || 'Unknown Guild',
            bot_client_id: process.env.NEXT_PUBLIC_BOT_CLIENT_ID,
          }),
        });
        
        if (!saveRes.ok) {
          const errorData = await saveRes.json();
          
          if (errorData.error?.includes('duplicate')) {
            setStatus('success');
          } else {
            setStatus('error');
            setError(`サーバー情報の登録に失敗しました: ${errorData.error || '不明なエラー'}`);
            return;
          }
        } else {
          setStatus('success');
        }
        
        setProgress(100);
        clearInterval(progressInterval);
        
        // ダッシュボードにリダイレクト
        setTimeout(() => {
          router.replace('/dashboard');
        }, 3000);
        
      } catch (e) {
        setStatus('error');
        setError(`Bot追加処理中にエラーが発生しました: ${e instanceof Error ? e.message : '不明なエラー'}`);
      }
    };

    checkAndRegister();
  }, [guildId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-gray-900">Bot追加処理</CardTitle>
          <CardDescription className="text-gray-600">
            サーバーへのBot追加状況を確認しています
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'checking' && (
            <div className="space-y-6">
              <div className="relative">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">処理中...</h3>
                <p className="text-sm text-gray-600">
                  DiscordサーバーにBotを追加しています
                </p>
                
                {/* プログレスバー */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500">{progress}% 完了</p>
              </div>
              
              {guildName && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>{guildName}</strong> を処理中
                  </p>
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                Guild ID: {guildId}
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-emerald-900">
                  Botが正常に追加されました！
                </h3>
                
                {guildName && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-sm text-emerald-800 font-medium">
                      <strong>{guildName}</strong> にNotionTaskBotが追加されました
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2 justify-center">
                  <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                    <Bot className="w-3 h-3 mr-1" />
                    Bot追加済み
                  </Badge>
                  <Badge variant="outline" className="text-amber-600 border-amber-200">
                    <Settings className="w-3 h-3 mr-1" />
                    Notion未設定
                  </Badge>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <Database className="w-4 h-4 mr-2" />
                    次のステップ
                  </h4>
                  <p className="text-sm text-blue-800">
                    ダッシュボードでNotionとの連携を設定して、タスク管理を開始できます。
                  </p>
                </div>
                
                <p className="text-sm text-gray-600">
                  ダッシュボードにリダイレクトします...
                </p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-red-900">
                  Bot追加に失敗しました
                </h3>
                
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">トラブルシューティング</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Botが正しくサーバーに追加されているか確認</li>
                    <li>• 管理者権限があるか確認</li>
                    <li>• インターネット接続を確認</li>
                    {error?.includes('401') && (
                      <>
                        <li>• <strong>認証エラー:</strong> ログインし直してください</li>
                        <li>• ブラウザのクッキーが有効になっているか確認</li>
                      </>
                    )}
                    {error?.includes('403') && (
                      <li>• <strong>権限エラー:</strong> このサーバーへのアクセス権限を確認</li>
                    )}
                    {error?.includes('404') && (
                      <li>• <strong>サーバーエラー:</strong> サーバーIDが正しいか確認</li>
                    )}
                    {error?.includes('API制限') && (
                      <>
                        <li>• <strong>レート制限エラー:</strong> DiscordのAPI制限に達しました</li>
                        <li>• しばらく待ってから再度お試しください</li>
                        <li>• 短時間での連続操作を避けてください</li>
                      </>
                    )}
                    {error?.includes('参加していません') && (
                      <>
                        <li>• <strong>サーバー参加エラー:</strong> まずサーバーに参加してください</li>
                        <li>• サーバーへの招待リンクを使用して参加</li>
                      </>
                    )}
                    {error?.includes('管理者権限') && (
                      <>
                        <li>• <strong>権限エラー:</strong> 管理者権限が必要です</li>
                        <li>• サーバーオーナーに管理者権限を要求</li>
                      </>
                    )}
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                    onClick={() => router.replace('/dashboard')}
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    ダッシュボードに戻る
                  </Button>
                  {error?.includes('401') && (
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white" 
                      onClick={() => {
                        // クッキーを削除してログインページにリダイレクト
                        deleteCookie('discord_access_token');
                        deleteCookie('discord_user_id');
                        deleteCookie('discord_username');
                        router.replace('/auth/login');
                      }}
                    >
                      🔄 ログインし直す
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={() => router.replace('/dashboard/select-guild')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    サーバー選択に戻る
                  </Button>
                  <Button 
                    variant="ghost"
                    className="w-full" 
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    再試行
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 