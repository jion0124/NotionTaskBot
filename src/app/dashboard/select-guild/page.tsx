'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Search, Settings, Plus, Bot, Database, Users, Crown, Shield, ArrowRight, ArrowLeft, RefreshCw, CheckCircle, AlertCircle, Zap, TrendingUp, Activity, Server } from 'lucide-react';
import { errorHandler, AppError, ERROR_CODES } from '@/lib/error-handler';
import { useCookie } from '@/hooks/useCookie';

interface Guild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

interface GuildWithBotStatus extends Guild {
  hasBot: boolean;
}

export default function SelectGuildPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getCookie } = useCookie();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [guildsWithBotStatus, setGuildsWithBotStatus] = useState<GuildWithBotStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // URLパラメータから特定のサーバーIDを取得
  const targetGuildId = searchParams.get('guildId');
  const targetGuildName = searchParams.get('guildName');

  const adminGuilds = useMemo(() => {
    return guilds.filter(guild => {
      const permissions = BigInt(guild.permissions);
      return (permissions & BigInt(0x8)) === BigInt(0x8);
    });
  }, [guilds]);

  const filteredGuilds = useMemo(() => {
    let list = guildsWithBotStatus;
    if (searchTerm) {
      list = list.filter(guild =>
        guild.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return list.slice().sort((a, b) => {
      // Bot追加済みを優先
      if (a.hasBot && !b.hasBot) return -1;
      if (!a.hasBot && b.hasBot) return 1;
      
      // オーナーを優先
      if (a.owner && !b.owner) return -1;
      if (!a.owner && b.owner) return 1;
      
      // 名前順
      return a.name.localeCompare(b.name);
    });
  }, [guildsWithBotStatus, searchTerm]);

  const fetchExistingBotConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/guilds');
      if (!res.ok) throw new Error('guilds fetch failed');
      const data = await res.json();
      return new Set(data.map((config: any) => config.guild_id));
    } catch (err) {
      return new Set<string>();
    }
  }, []);

  const fetchGuilds = useCallback(async () => {
    setLoading(true);
    setError(null);

    // クッキーからアクセストークンを取得
    const accessToken = getCookie('discord_access_token');
    
    if (!accessToken) {
      setError('認証情報が見つかりません。再度ログインしてください。');
      setLoading(false);
      return;
    }

    let retryCount = 0;
    let lastError = null;
    while (retryCount < 3) {
      try {
        const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (guildsRes.status === 429) {
          const retryAfter = guildsRes.headers.get('Retry-After');
          const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
          retryCount++;
          if (retryCount >= 3) {
            setError('DiscordのAPI制限に達しました。しばらく待ってから再度お試しください。');
            setLoading(false);
            return;
          }
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }
        if (!guildsRes.ok) {
          setError('Discordサーバーの取得に失敗しました');
          setLoading(false);
          return;
        }
        const guildsData = await guildsRes.json();
        setGuilds(guildsData);
        const existingBotGuildIds = await fetchExistingBotConfigs();
        const guildsWithStatus = guildsData.filter((guild: any) => guild.permissions).map((guild: any) => ({
          ...guild,
          hasBot: existingBotGuildIds.has(guild.id)
        }));
        setGuildsWithBotStatus(guildsWithStatus);
        setLoading(false);
        return;
      } catch (err) {
        lastError = err;
        retryCount++;
        await new Promise(res => setTimeout(res, 1000));
      }
    }
    setError('Discordサーバー一覧の取得に繰り返し失敗しました。時間をおいて再度お試しください。');
    setLoading(false);
  }, [getCookie, fetchExistingBotConfigs]);

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  useEffect(() => {
    const updateGuildsWithBotStatus = async () => {
      if (adminGuilds.length > 0) {
        const existingBotGuildIds = await fetchExistingBotConfigs();
        const guildsWithStatus = adminGuilds.map(guild => ({
          ...guild,
          hasBot: existingBotGuildIds.has(guild.id)
        }));
        setGuildsWithBotStatus(guildsWithStatus);
      }
    };

    updateGuildsWithBotStatus();
  }, [adminGuilds, fetchExistingBotConfigs]);

  // 特定のサーバーが選択されている場合の処理
  useEffect(() => {
    if (targetGuildId && guilds.length > 0) {
      const guild = guilds.find(g => g.id === targetGuildId);
      if (guild) {
        setSelectedGuild(guild);
      }
    }
  }, [targetGuildId, guilds]);

  // Bot招待URL生成（メモ化されたコールバック）
  const generateBotInviteUrl = useCallback((guildId: string, redirectUri: string, state: string) => {
    const clientId = process.env.NEXT_PUBLIC_BOT_CLIENT_ID;
    if (!clientId) {
      throw errorHandler.createError(
        'BotのクライアントIDが設定されていません',
        'CONFIGURATION_ERROR'
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      permissions: '2147483648', // Administrator permission
      scope: 'bot applications.commands', // Modern scope for bots and commands
      guild_id: guildId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
    });
    
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }, []);

  // Bot招待処理（API経由で保存）
  const inviteBot = useCallback(async (guild: GuildWithBotStatus) => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const state = guild.id;
      const inviteUrl = generateBotInviteUrl(guild.id, redirectUri, state);

      // デバッグ用ログ
      console.log('【Bot招待URL生成】');
      console.log('client_id:', process.env.NEXT_PUBLIC_BOT_CLIENT_ID);
      console.log('permissions:', '2147483648');
      console.log('scope:', 'bot applications.commands');
      console.log('guild_id:', guild.id);
      console.log('redirect_uri:', redirectUri);
      console.log('state:', state);
      console.log('生成されたURL:', inviteUrl);

      // URLの必須パラメータチェック
      if (!inviteUrl.includes('client_id=')) {
        setError('BotのクライアントIDがURLに含まれていません。環境変数を確認してください。');
        return;
      }
      if (!inviteUrl.includes('scope=bot') || !inviteUrl.includes('applications.commands')) {
        setError('scopeパラメータが不正です。botとapplications.commandsが必要です。');
        return;
      }
      if (!inviteUrl.includes('permissions=')) {
        setError('permissionsパラメータがURLに含まれていません。');
        return;
      }

      window.location.href = inviteUrl;
    } catch (err) {
      setError('Bot招待URLの生成に失敗しました。環境変数や設定を確認してください。');
    }
  }, [generateBotInviteUrl]);

  const goToDashboard = useCallback((guild: GuildWithBotStatus) => {
    router.push(`/dashboard/${guild.id}`);
  }, [router]);

  const goBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGuilds();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
                  <LoadingSpinner size="lg" className="text-white" />
                </div>
                <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto animate-ping opacity-20"></div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">読み込み中...</h2>
                <p className="text-gray-600">Discordサーバー一覧を取得しています</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 特定のサーバーが選択されている場合の表示
  if (selectedGuild) {
    const guildWithStatus = guildsWithBotStatus.find(g => g.id === selectedGuild.id);
    const hasBot = guildWithStatus?.hasBot || false;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* 背景装飾 */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/5 to-purple-600/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/5 to-blue-600/5 rounded-full blur-3xl"></div>
        </div>

        {/* ヘッダー */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4 sm:gap-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Bot追加</h1>
                  <p className="text-xs sm:text-sm text-gray-600">サーバーにNotionTaskBotを追加</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 戻るボタン */}
          <div className="mb-6">
            <Button 
              onClick={() => router.push('/dashboard')} 
              variant="outline" 
              size="sm"
              className="bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ダッシュボードに戻る
            </Button>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 選択されたサーバーの詳細 */}
          <Card className="mb-8 shadow-2xl border-0 bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-6">
                {selectedGuild.icon ? (
                  <img
                    src={`https://cdn.discordapp.com/icons/${selectedGuild.id}/${selectedGuild.icon}.png`}
                    alt={selectedGuild.name}
                    className="w-20 h-20 rounded-3xl shadow-xl border-4 border-white/30"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-3xl flex items-center justify-center shadow-xl border-4 border-white/30">
                    <span className="text-white font-bold text-3xl">
                      {selectedGuild.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <CardTitle className="text-3xl font-bold text-gray-900 mb-3">{selectedGuild.name}</CardTitle>
                  <div className="flex items-center space-x-3">
                    {selectedGuild.owner ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        <Crown className="w-4 h-4 mr-1" />
                        オーナー
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        <Shield className="w-4 h-4 mr-1" />
                        管理者
                      </Badge>
                    )}
                    {hasBot ? (
                      <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                        <Bot className="w-4 h-4 mr-1" />
                        Bot追加済み
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
                        <Plus className="w-4 h-4 mr-1" />
                        Bot未追加
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {hasBot ? (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-emerald-100 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-bold text-emerald-900">Botが既に追加されています</h3>
                    </div>
                    <p className="text-emerald-800 leading-relaxed text-lg">
                      このサーバーには既にNotionTaskBotが追加されています。管理画面で設定を確認し、Notionとの連携を完了させることができます。
                    </p>
                  </div>
                  <Button 
                    onClick={() => goToDashboard(guildWithStatus!)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
                  >
                    <Settings className="w-6 h-6 mr-3" />
                    管理画面を開く
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-xl">
                        <Bot className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-900">NotionTaskBotを追加</h3>
                    </div>
                    <p className="text-blue-800 leading-relaxed text-lg mb-6">
                      NotionTaskBotをこのサーバーに追加して、Discordから直接Notionにタスクを管理できるようになります。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
                          <Database className="w-5 h-5 mr-2" />
                          タスク管理
                        </h4>
                        <ul className="text-blue-800 space-y-2">
                          <li className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            Discordから直接Notionにタスク作成
                          </li>
                          <li className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            スラッシュコマンドでタスク管理
                          </li>
                        </ul>
                      </div>
                      <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
                        <h4 className="font-bold text-blue-900 mb-3 flex items-center text-lg">
                          <Users className="w-5 h-5 mr-2" />
                          AI機能
                        </h4>
                        <ul className="text-blue-800 space-y-2">
                          <li className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            自然言語でのタスク作成
                          </li>
                          <li className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                            チーム全体でのタスク共有
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={() => inviteBot(guildWithStatus!)}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl"
                  >
                    <Plus className="w-6 h-6 mr-3" />
                    Botを追加する
                    <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 通常のサーバー選択画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/5 to-purple-600/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/5 to-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      {/* ヘッダー */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">サーバー選択</h1>
                <p className="text-xs sm:text-sm text-gray-600">Botを追加するサーバーを選択</p>
              </div>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
              className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              更新
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Button 
            onClick={() => router.push('/dashboard')} 
            variant="outline" 
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ダッシュボードに戻る
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 検索バー */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="サーバーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 bg-white/90 backdrop-blur-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-12 text-lg rounded-2xl"
            />
          </div>
        </div>

        {/* サーバー一覧 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGuilds.map((guild) => (
            <Card
              key={guild.id}
              className={`group transition-all duration-500 transform hover:-translate-y-2 rounded-3xl overflow-hidden border-2
                ${guild.hasBot
                  ? 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-white border-emerald-200 hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.15)]'
                  : 'bg-gradient-to-br from-blue-50 via-blue-100 to-white border-blue-200 hover:shadow-[0_8px_32px_0_rgba(59,130,246,0.12)]'}
              `}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {guild.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="w-12 h-12 rounded-xl"
                      />
                    ) : (
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border-2 ${guild.hasBot ? 'bg-emerald-100 border-emerald-100' : 'bg-blue-100 border-blue-100'}`}>
                        <span className="text-white font-bold text-2xl">
                          {guild.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-gray-900 truncate mb-2">
                        {guild.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {guild.owner ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <Crown className="w-3 h-3 mr-1" />
                            オーナー
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                            <Shield className="w-3 h-3 mr-1" />
                            管理者
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  {guild.hasBot ? (
                    <Badge variant="default" className="bg-emerald-500/90 text-white border-emerald-600 shadow-md">
                      <Bot className="w-4 h-4 mr-1" />
                      Bot追加済み
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50 shadow-md">
                      <Plus className="w-4 h-4 mr-1" />
                      Bot未追加
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {guild.hasBot ? (
                  <Button
                    onClick={() => goToDashboard(guild)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    管理画面を開く
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => inviteBot(guild)}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Botを追加
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredGuilds.length === 0 && !error && (
          <Card className="text-center py-20 bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border-0">
            <CardContent>
              <div className="text-8xl mb-8">🤖</div>
              <h3 className="text-3xl font-bold text-gray-900 mb-6">
                {searchTerm ? '検索結果が見つかりません' : '管理者権限を持つサーバーが見つかりません'}
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed text-lg">
                {searchTerm 
                  ? '別のキーワードで検索してみてください。'
                  : '管理者権限を持つDiscordサーバーに参加してから再度お試しください。'
                }
              </p>
              {searchTerm ? (
                <Button onClick={() => setSearchTerm('')} variant="outline" size="lg" className="rounded-2xl">
                  検索をクリア
                </Button>
              ) : (
                <Button onClick={goBackToDashboard} size="lg" className="rounded-2xl">
                  ダッシュボードに戻る
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}