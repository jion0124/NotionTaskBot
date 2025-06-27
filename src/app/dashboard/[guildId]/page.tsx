'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Settings, Database, Bot, ArrowRight, ArrowLeft, Command, Users, RefreshCw, Crown } from 'lucide-react';
import { errorHandler } from '@/lib/error-handler';
import { useCookie } from '@/hooks/useCookie';

interface GuildConfig {
  guild_id: string;
  guild_name: string;
  bot_client_id: string;
  notion_api_key?: string;
  notion_database_id?: string;
  discord_user_id: string;
  created_at: string;
  updated_at: string;
  owner?: boolean;
}

// 実装済みコマンドの定義
const IMPLEMENTED_COMMANDS = [
  {
    name: 'setup',
    description: 'Notion連携の初期設定',
    usage: '/setup notion_token:<トークン> notion_database_id:<データベースID>',
    category: '設定',
    icon: '⚙️',
    status: 'active',
    details: 'Notion APIとの連携を設定します。統合トークンとデータベースIDが必要です。'
  },
  {
    name: 'config',
    description: '現在の設定を確認',
    usage: '/config',
    category: '設定',
    icon: '📋',
    status: 'active',
    details: '現在のNotion連携設定を表示します。'
  },
  {
    name: 'reset',
    description: '設定をリセット',
    usage: '/reset',
    category: '設定',
    icon: '🔄',
    status: 'active',
    details: '保存された設定をすべて削除します。'
  },
  {
    name: 'addtask',
    description: 'Notionにタスクを追加',
    usage: '/addtask content:<タスク内容>',
    category: 'タスク管理',
    icon: '➕',
    status: 'active',
    details: '指定した内容でNotionデータベースに新しいタスクを作成します。'
  },
  {
    name: 'mytasks',
    description: '指定担当者の未完了タスク一覧',
    usage: '/mytasks assignee:<担当者名>',
    category: 'タスク管理',
    icon: '📝',
    status: 'active',
    details: '指定した担当者の未完了タスクを一覧表示します。'
  },
  {
    name: 'duetasks',
    description: '3日以内の期限タスク一覧',
    usage: '/duetasks [assignee:<担当者名>]',
    category: 'タスク管理',
    icon: '⏰',
    status: 'active',
    details: '3日以内に期限が来るタスクを表示します。担当者を指定することも可能です。'
  },
  {
    name: 'advise',
    description: '担当者のタスクへのアドバイス',
    usage: '/advise assignee:<担当者名>',
    category: 'AI支援',
    icon: '🤖',
    status: 'active',
    details: 'AIが指定した担当者のタスク状況を分析し、アドバイスを提供します。'
  },
  {
    name: 'weekprogress',
    description: '今週作成されたタスク一覧',
    usage: '/weekprogress',
    category: 'レポート',
    icon: '📊',
    status: 'active',
    details: '今週作成されたタスクの一覧と進捗状況を表示します。'
  },
  {
    name: 'weekadvise',
    description: '今週期限のタスクへのアドバイス',
    usage: '/weekadvise',
    category: 'AI支援',
    icon: '💡',
    status: 'active',
    details: '今週期限が来るタスクについてAIがアドバイスを提供します。'
  },
  {
    name: 'listassignees',
    description: '上位10名の担当者を表示',
    usage: '/listassignees',
    category: 'レポート',
    icon: '👥',
    status: 'active',
    details: 'タスク数が多い上位10名の担当者を表示します。'
  },
  {
    name: 'liststatus',
    description: '上位10件のステータスを表示',
    usage: '/liststatus',
    category: 'レポート',
    icon: '📈',
    status: 'active',
    details: '使用頻度の高い上位10件のステータスを表示します。'
  }
];

export default function DashboardPage() {
  const params = useParams<{ guildId: string }>();
  const router = useRouter();
  const { getCookie } = useCookie();
  const username = getCookie('discord_username');
  const guildId = params.guildId;
  const [guildConfig, setGuildConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guildIcon, setGuildIcon] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // サーバー設定取得（メモ化されたコールバック）
  const fetchGuildConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await errorHandler.handleAsync(
        async () => {
          const innerResult = await errorHandler.handleAsync(
            async () => {
              const response = await fetch(`/api/guilds/${guildId}`);
              if (!response.ok) throw new Error('Network response was not ok');
              return await response.json();
            },
            'fetch-guild-config'
          );

          if (!innerResult.success) throw innerResult.error;
          return innerResult.data;
        },
        'fetch-guild-config'
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setGuildConfig(result.data);
      
      // サーバーアイコンを取得
      try {
        const accessToken = getCookie('discord_access_token');
        if (accessToken) {
          const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (guildsRes.ok) {
            const guilds = await guildsRes.json();
            const guild = guilds.find((g: any) => g.id === guildId);
            if (guild?.icon) {
              setGuildIcon(`https://cdn.discordapp.com/icons/${guildId}/${guild.icon}.png`);
            }
          }
        }
      } catch (iconError) {
        console.warn('Failed to fetch guild icon:', iconError);
      }
    } catch (err) {
      errorHandler.logError(err as Error, 'fetch-guild-config');
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [guildId, getCookie]);

  useEffect(() => {
    if (guildId) {
      fetchGuildConfig();
    }
  }, [guildId, fetchGuildConfig]);

  // ステータスカードのメモ化（クリック不可）
  const statusCards = [
    {
      title: "Bot Status",
      icon: <Bot className="w-6 h-6" />,
      status: "接続中",
      statusColor: "bg-emerald-500",
      statusTextColor: "text-emerald-700",
      description: `Client ID: ${guildConfig?.bot_client_id || 'N/A'}`,
      details: "Discordサーバーに正常に接続されています",
    },
    {
      title: "Notion連携",
      icon: <Database className="w-6 h-6" />,
      status: guildConfig?.notion_api_key ? '設定済み' : '未設定',
      statusColor: guildConfig?.notion_api_key ? 'bg-emerald-500' : 'bg-amber-500',
      statusTextColor: guildConfig?.notion_api_key ? 'text-emerald-700' : 'text-amber-700',
      description: guildConfig?.notion_api_key ? 'API連携済み' : '設定が必要',
      details: guildConfig?.notion_api_key ? 'Notionとの連携が完了しています' : 'Notion設定ページでAPI連携を行ってください',
    },
    {
      title: "利用可能コマンド",
      icon: <Command className="w-6 h-6" />,
      status: `${IMPLEMENTED_COMMANDS.length}個`,
      statusColor: "bg-blue-500",
      statusTextColor: "text-blue-700",
      description: "すべてのコマンドが利用可能",
      details: "Discordでスラッシュコマンドとして使用できます",
    },
  ];

  // 機能カードのメモ化
  const featureCards = [
    {
      title: "Notion設定",
      icon: <Settings className="w-6 h-6" />,
      description: "Notion API連携の設定と管理",
      href: `/dashboard/${guildId}/notion`,
      badge: guildConfig?.notion_api_key ? "設定済み" : "未設定",
      badgeColor: guildConfig?.notion_api_key ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200",
      buttonText: guildConfig?.notion_api_key ? "設定を確認" : "設定を開始",
      buttonVariant: guildConfig?.notion_api_key ? "outline" : "default" as const,
    },
    {
      title: "コマンド一覧",
      icon: <Command className="w-6 h-6" />,
      description: "利用可能なコマンドの詳細と使用方法",
      href: `/dashboard/${guildId}/commands`,
      badge: `${IMPLEMENTED_COMMANDS.length}個`,
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
      buttonText: "詳細を確認",
      buttonVariant: "outline" as const,
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGuildConfig();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">サーバー情報を読み込み中</h3>
          <p className="text-gray-600">Discordサーバーの情報を取得しています...</p>
        </div>
      </div>
    );
  }

  if (error || !guildConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-600 rounded-full mx-auto flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">エラーが発生しました</h2>
                <p className="text-gray-600 mb-4">サーバー設定の取得に失敗しました</p>
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  className="w-full bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボードに戻る
                </Button>
                <Button
                  onClick={() => router.push('/auth/login')}
                  variant="ghost"
                  className="w-full text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  ログインページに戻る
                </Button>
              </div>
            </div>
          </div>
        </div>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* 戻るボタン */}
        <div className="mb-4">
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
        {/* サーバー情報表示 */}
        {guildConfig && (
          <div className="flex items-center gap-3 mb-6">
            {guildIcon ? (
              <img
                src={guildIcon}
                alt={guildConfig.guild_name}
                className="w-10 h-10 rounded-xl shadow border"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-xl flex items-center justify-center shadow">
                <span className="text-white font-bold text-lg">
                  {guildConfig.guild_name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-bold text-lg truncate max-w-xs" title={guildConfig.guild_name}>
              {guildConfig.guild_name}
            </span>
            {guildConfig.owner && (
              <Badge variant="outline" className="text-amber-600 border-amber-200 text-xs flex items-center">
                <Crown className="w-3 h-3 mr-1" />
                オーナー
              </Badge>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6 sm:mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ステータスカード（クリック不可） */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
            システムステータス
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {statusCards.map((card, index) => (
              <div
                key={index}
                className="group relative"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Card className={`rounded-xl border border-gray-200 shadow-md transition-all duration-200
                  ${card.title === 'Bot Status'
                    ? 'bg-gradient-to-br from-emerald-50 to-white'
                    : card.title === 'Notion連携'
                      ? (card.status === '設定済み'
                        ? 'bg-gradient-to-br from-emerald-50 to-white'
                        : 'bg-gradient-to-br from-amber-50 to-white')
                      : 'bg-gradient-to-br from-blue-50 to-white'}
                `}>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-base font-semibold text-gray-900">
                      <div className={`p-2 rounded-lg shadow-sm ${card.title === 'Bot Status' ? 'bg-emerald-100 text-emerald-700' : card.title === 'Notion連携' ? (card.status === '設定済み' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700') : 'bg-blue-100 text-blue-700'}`}>{card.icon}</div>
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 ${card.statusColor} rounded-full`}></div>
                      <span className={`text-xs font-semibold ${card.statusTextColor}`}>{card.status}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">{card.description}</p>
                      <p className="text-xs text-gray-400 leading-relaxed">{card.details}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="text-xs text-gray-300 font-medium">情報表示のみ</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* 機能カード */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
            管理機能
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {featureCards.map((card, index) => (
              <Card
                key={index}
                className={`rounded-xl border border-gray-200 shadow-md transition-all duration-200
                  ${card.title === 'Notion設定'
                    ? (card.badge === '設定済み'
                      ? 'bg-gradient-to-br from-emerald-50 to-white'
                      : 'bg-gradient-to-br from-amber-50 to-white')
                    : 'bg-gradient-to-br from-blue-50 to-white'}
                `}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3 text-base font-semibold text-gray-900">
                      <div className={`p-2 rounded-lg shadow-sm ${card.title === 'Notion設定' ? (card.badge === '設定済み' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700') : 'bg-blue-100 text-blue-700'}`}>{card.icon}</div>
                      {card.title}
                    </CardTitle>
                    <Badge variant="outline" className={`text-xs font-medium px-2 py-1 border-none ${card.title === 'Notion設定' ? (card.badge === '設定済み' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700') : 'bg-blue-100 text-blue-700'}`}>{card.badge}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <p className="text-xs text-gray-600 leading-relaxed">{card.description}</p>
                    <Link href={card.href} prefetch={false}>
                      <Button
                        variant={card.buttonVariant}
                        className={`w-full rounded-lg text-xs font-semibold py-2 transition-all duration-150
                          ${card.title === 'Notion設定'
                            ? (card.badge === '設定済み'
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-amber-400 text-white hover:bg-amber-500')
                            : 'bg-blue-600 text-white hover:bg-blue-700'}
                        `}
                      >
                        {card.buttonText}
                        <ArrowRight className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* クイックスタートガイド */}
        <div className="mt-12">
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-gray-900">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
                クイックスタートガイド
              </CardTitle>
              <CardDescription className="text-gray-600">
                NotionTaskBotを始めるための手順
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Notion設定</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Notion API連携を設定して、タスク管理を開始します。</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">コマンド確認</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">利用可能なコマンドを確認し、使用方法を学びます。</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Discordで使用</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">Discordサーバーでスラッシュコマンドを使用してタスク管理を開始します。</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 