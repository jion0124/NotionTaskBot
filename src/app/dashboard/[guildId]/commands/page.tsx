'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { ArrowLeft, Command, Search } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { errorHandler, AppError, ERROR_CODES } from '@/lib/error-handler';

// 実装済みコマンドの定義
const IMPLEMENTED_COMMANDS = [
  {
    name: 'setup',
    description: 'Notion連携の初期設定',
    usage: '/setup notion_token:<トークン> notion_database_id:<データベースID>',
    category: '設定',
    icon: '⚙️',
    status: 'active',
    details: 'Notion APIとの連携を設定します。統合トークンとデータベースIDが必要です。',
    examples: [
      '/setup notion_token:secret_xxx notion_database_id:12345678-1234-1234-1234-123456789012'
    ]
  },
  {
    name: 'config',
    description: '現在の設定を確認',
    usage: '/config',
    category: '設定',
    icon: '📋',
    status: 'active',
    details: '現在のNotion連携設定を表示します。',
    examples: [
      '/config'
    ]
  },
  {
    name: 'reset',
    description: '設定をリセット',
    usage: '/reset',
    category: '設定',
    icon: '🔄',
    status: 'active',
    details: '保存された設定をすべて削除します。',
    examples: [
      '/reset'
    ]
  },
  {
    name: 'addtask',
    description: 'Notionにタスクを追加',
    usage: '/addtask content:<タスク内容>',
    category: 'タスク管理',
    icon: '➕',
    status: 'active',
    details: '指定した内容でNotionデータベースに新しいタスクを作成します。',
    examples: [
      '/addtask content:プロジェクトの企画書を作成する',
      '/addtask content:クライアントミーティングの準備'
    ]
  },
  {
    name: 'mytasks',
    description: '指定担当者の未完了タスク一覧',
    usage: '/mytasks assignee:<担当者名>',
    category: 'タスク管理',
    icon: '📝',
    status: 'active',
    details: '指定した担当者の未完了タスクを一覧表示します。',
    examples: [
      '/mytasks assignee:田中太郎',
      '/mytasks assignee:佐藤花子'
    ]
  },
  {
    name: 'duetasks',
    description: '3日以内の期限タスク一覧',
    usage: '/duetasks [assignee:<担当者名>]',
    category: 'タスク管理',
    icon: '⏰',
    status: 'active',
    details: '3日以内に期限が来るタスクを表示します。担当者を指定することも可能です。',
    examples: [
      '/duetasks',
      '/duetasks assignee:田中太郎'
    ]
  },
  {
    name: 'advise',
    description: '担当者のタスクへのアドバイス',
    usage: '/advise assignee:<担当者名>',
    category: 'AI支援',
    icon: '🤖',
    status: 'active',
    details: 'AIが指定した担当者のタスク状況を分析し、アドバイスを提供します。',
    examples: [
      '/advise assignee:田中太郎',
      '/advise assignee:佐藤花子'
    ]
  },
  {
    name: 'weekprogress',
    description: '今週作成されたタスク一覧',
    usage: '/weekprogress',
    category: 'レポート',
    icon: '📊',
    status: 'active',
    details: '今週作成されたタスクの一覧と進捗状況を表示します。',
    examples: [
      '/weekprogress'
    ]
  },
  {
    name: 'weekadvise',
    description: '今週期限のタスクへのアドバイス',
    usage: '/weekadvise',
    category: 'AI支援',
    icon: '💡',
    status: 'active',
    details: '今週期限が来るタスクについてAIがアドバイスを提供します。',
    examples: [
      '/weekadvise'
    ]
  },
  {
    name: 'listassignees',
    description: '上位10名の担当者を表示',
    usage: '/listassignees',
    category: 'レポート',
    icon: '👥',
    status: 'active',
    details: 'タスク数が多い上位10名の担当者を表示します。',
    examples: [
      '/listassignees'
    ]
  },
  {
    name: 'liststatus',
    description: '上位10件のステータスを表示',
    usage: '/liststatus',
    category: 'レポート',
    icon: '📈',
    status: 'active',
    details: '使用頻度の高い上位10件のステータスを表示します。',
    examples: [
      '/liststatus'
    ]
  }
];

export default function CommandsPage() {
  const params = useParams<{ guildId: string }>();
  const router = useRouter();
  const guildId = params.guildId;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // デバウンスされた検索語
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // カテゴリー一覧
  const categories = useMemo(() => {
    const cats = Array.from(new Set(IMPLEMENTED_COMMANDS.map(cmd => cmd.category)));
    return ['all', ...cats];
  }, []);

  // フィルタリングされたコマンド（メモ化）
  const filteredCommands = useMemo(() => {
    let filtered = IMPLEMENTED_COMMANDS;

    // カテゴリーフィルター
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(cmd => cmd.category === selectedCategory);
    }

    // 検索フィルター
    if (debouncedSearchTerm) {
      filtered = filtered.filter(cmd =>
        cmd.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        cmd.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        cmd.details.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [debouncedSearchTerm, selectedCategory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl"></div>
      </div>

      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Command className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">コマンド一覧</h1>
                <p className="text-xs sm:text-sm text-gray-600">利用可能なコマンドの詳細と使用方法</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-8">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Button 
            onClick={() => router.push(`/dashboard/${guildId}`)} 
            variant="outline" 
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            サーバー設定に戻る
          </Button>
        </div>

        {/* フィルター */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 検索 */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="コマンド名、説明、詳細で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* カテゴリーフィルター */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 border border-white/20'
                  }`}
                >
                  {category === 'all' ? 'すべて' : category}
                </button>
              ))}
            </div>
          </div>

          {/* 結果表示 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredCommands.length} 件のコマンドが見つかりました
            </span>
            <span className="text-sm text-gray-500">
              {searchTerm && `"${searchTerm}" で検索中`}
            </span>
          </div>
        </div>

        {/* コマンド一覧 */}
        <div className="space-y-6">
          {filteredCommands.map((command, index) => (
            <Card 
              key={command.name} 
              className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{command.icon}</div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        /{command.name}
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          command.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {command.status === 'active' ? '利用可能' : '開発中'}
                        </span>
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        {command.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      command.category === '設定' ? 'bg-blue-100 text-blue-700' :
                      command.category === 'タスク管理' ? 'bg-green-100 text-green-700' :
                      command.category === 'AI支援' ? 'bg-purple-100 text-purple-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {command.category}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-6">
                {/* 詳細説明 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">詳細</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {command.details}
                  </p>
                </div>

                {/* 使用方法 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">使用方法</h4>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <code className="text-sm font-mono text-gray-800">
                      {command.usage}
                    </code>
                  </div>
                </div>

                {/* 使用例 */}
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">使用例</h4>
                  <div className="space-y-2">
                    {command.examples.map((example, idx) => (
                      <div key={idx} className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <code className="text-sm font-mono text-blue-800">
                          {example}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 注意事項 */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h5 className="font-semibold text-amber-800 mb-1">使用方法</h5>
                      <p className="text-sm text-amber-700">
                        これらのコマンドはDiscordサーバー内でスラッシュコマンド（/）として使用できます。
                        コマンドを入力すると、自動的に候補が表示されます。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 空の状態 */}
        {filteredCommands.length === 0 && (
          <Card className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">コマンドが見つかりません</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? `"${searchTerm}" に一致するコマンドはありません。` : '選択したカテゴリーにコマンドがありません。'}
              </p>
              <Button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('all');
                }}
                variant="outline"
                className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80 transition-all duration-200"
              >
                フィルターをリセット
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 