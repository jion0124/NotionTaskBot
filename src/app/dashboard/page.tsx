'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Settings, Plus, Bot, Database, Users, Crown, Shield, ArrowRight, RefreshCw } from 'lucide-react';
import { getDiscordGuilds } from '@/lib/discord';
import GuildCard from '@/components/dashboard/GuildCard';
import { useCookie } from '@/hooks/useCookie';
import { useDiscordGuilds } from '@/hooks/useDiscordGuilds';

interface Guild {
  id: string;
  name: string;
  icon: string;
  owner: boolean;
  permissions: string;
  features: string[];
}

interface BotStatus {
  guildId: string;
  hasBot: boolean;
  guildInfo: {
    guild_id: string;
    guild_name: string;
    bot_client_id: string;
    notion_api_key: string | null;
    notion_database_id: string | null;
  } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getCookie, deleteCookie } = useCookie();
  const username = getCookie('discord_username');
  const accessToken = getCookie('discord_access_token');

  const {
    guilds,
    botStatus,
    loading,
    error,
    refresh,
  } = useDiscordGuilds(accessToken);

  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const sortedGuilds = useMemo(() => {
    return guilds
      .filter(guild => 
        guild.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const aStatus = botStatus.find(status => status.guildId === a.id);
        const bStatus = botStatus.find(status => status.guildId === b.id);
        if (aStatus?.hasBot && !bStatus?.hasBot) return -1;
        if (!aStatus?.hasBot && bStatus?.hasBot) return 1;
        if (a.owner && !b.owner) return -1;
        if (!a.owner && b.owner) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [guilds, searchTerm, botStatus]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleGuildSelect = (guildId: string) => {
    router.push(`/dashboard/${guildId}`);
  };

  const handleAddBot = (guildId: string, guildName: string) => {
    router.push(`/dashboard/select-guild?guildId=${guildId}&guildName=${encodeURIComponent(guildName)}`);
  };

  const handleLogout = () => {
    deleteCookie('discord_access_token');
    deleteCookie('discord_user_id');
    deleteCookie('discord_username');
    router.push('/auth/login');
  };

  const getStatusBadge = (guildId: string) => {
    const status = botStatus.find(s => s.guildId === guildId);
    if (!status) return null;

    if (status.hasBot) {
      const hasNotion = status.guildInfo?.notion_api_key && status.guildInfo?.notion_database_id;
      return (
        <div className="flex gap-2">
          <Badge variant="default" className="bg-emerald-100 text-emerald-800 border-emerald-200">
            <Bot className="w-3 h-3 mr-1" />
            Bot追加済み
          </Badge>
          {hasNotion ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
              <Database className="w-3 h-3 mr-1" />
              Notion連携済み
            </Badge>
          ) : (
            <Badge variant="outline" className="text-amber-600 border-amber-200">
              <Settings className="w-3 h-3 mr-1" />
              Notion未設定
            </Badge>
          )}
        </div>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-200">
          <Plus className="w-3 h-3 mr-1" />
          Bot未追加
        </Badge>
      );
    }
  };

  const stats = useMemo(() => {
    const totalGuilds = guilds.length;
    const botAddedGuilds = botStatus.filter(s => s.hasBot).length;
    const notionConnectedGuilds = botStatus.filter(s => 
      s.hasBot && s.guildInfo?.notion_api_key && s.guildInfo?.notion_database_id
    ).length;
    
    return { totalGuilds, botAddedGuilds, notionConnectedGuilds };
  }, [guilds, botStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">サーバー情報を読み込み中</h3>
            <p className="text-gray-600">Discordサーバーの情報を取得しています...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">NotionTaskBot</h1>
                <p className="text-xs sm:text-sm text-gray-600">Discord × Notion タスク管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {username && (
                <div className="hidden sm:flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{username}</span>
                </div>
              )}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm"
                disabled={refreshing}
                className="hidden sm:flex"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                更新
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm" className="text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2">
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {error && (
          <Alert variant="destructive" className="mb-6 sm:mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 検索バー */}
        <div className="mb-6 sm:mb-8">
          <div className="relative max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="サーバーを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/80 backdrop-blur-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500 h-10 sm:h-12 text-sm sm:text-lg rounded-xl"
            />
          </div>
        </div>

        {/* サーバー一覧 */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sortedGuilds.map((guild) => (
            <GuildCard
              key={guild.id}
              guild={guild}
              status={botStatus.find(status => status.guildId === guild.id) || null}
              onSelect={handleGuildSelect}
              onAddBot={handleAddBot}
            />
          ))}
        </div>

        {sortedGuilds.length === 0 && !error && (
          <div className="text-center py-12 sm:py-16 bg-white/80 backdrop-blur-sm rounded-xl">
            <div className="text-6xl sm:text-8xl mb-4 sm:mb-6">🤖</div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-4">
              {searchTerm ? '検索結果が見つかりません' : '管理者権限を持つサーバーが見つかりません'}
            </h3>
            <p className="text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed text-sm sm:text-base">
              {searchTerm 
                ? '別のキーワードで検索してみてください。'
                : '管理者権限を持つDiscordサーバーに参加してから再度お試しください。'
              }
            </p>
            {searchTerm ? (
              <Button onClick={() => setSearchTerm('')} variant="outline" className="text-xs sm:text-base px-4 py-2">
                検索をクリア
              </Button>
            ) : (
              <Button onClick={() => router.push('/auth/login')} className="text-xs sm:text-base px-4 py-2">
                再ログイン
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 