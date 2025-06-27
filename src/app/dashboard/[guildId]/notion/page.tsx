'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { errorHandler, AppError, ERROR_CODES } from '@/lib/error-handler';
import { createNotionClient, NotionDatabase, NotionTask, CreateTaskRequest } from '@/lib/notion';
import { apiFetch } from '@/lib/utils';
import { ArrowLeft, Database } from 'lucide-react';

// ===== 型定義の統一 =====
interface GuildConfig {
  guild_id: string;
  guild_name: string;
  notion_api_key?: string;
  notion_database_id?: string;
  bot_client_id?: string;
  discord_user_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface NotionTestResponse {
  database: NotionDatabase;
}

interface NotionTasksResponse {
  tasks: NotionTask[];
}

interface NotionFormData {
  apiKey: string;
  databaseId: string;
}

// ===== カスタムフック =====
const useNotionSettings = (guildId: string) => {
  const [guildConfig, setGuildConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchGuildConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await errorHandler.handleAsync<GuildConfig>(
        async () => {
          const response = await apiFetch<GuildConfig>(`/api/guilds/${guildId}`);
          const data = await response;
          if (!data) {
            throw errorHandler.createError(
              'サーバー設定が見つかりません',
              'DISCORD_GUILD_NOT_FOUND'
            );
          }
          return data;
        },
        'fetch-guild-config'
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setGuildConfig(result.data);
    } catch (err) {
      errorHandler.logError(err as Error, 'fetch-guild-config');
      setError('予期しないエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    if (guildId) {
      fetchGuildConfig();
    }
  }, [guildId, fetchGuildConfig]);

  return {
    guildConfig,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchGuildConfig,
  };
};

const useNotionForm = (guildConfig: GuildConfig | null) => {
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionDatabaseUrl, setNotionDatabaseUrl] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [isExtractingId, setIsExtractingId] = useState(false);

  // 初期値の設定
  useEffect(() => {
    if (guildConfig) {
      setNotionApiKey(guildConfig.notion_api_key || '');
      if (guildConfig.notion_database_id) {
        setNotionDatabaseId(guildConfig.notion_database_id);
        setNotionDatabaseUrl(`https://www.notion.so/database/${guildConfig.notion_database_id}`);
      }
    }
  }, [guildConfig]);

  return {
    notionApiKey,
    setNotionApiKey,
    notionDatabaseUrl,
    setNotionDatabaseUrl,
    notionDatabaseId,
    setNotionDatabaseId,
    isExtractingId,
    setIsExtractingId,
  };
};

const useNotionDatabase = () => {
  const [databaseInfo, setDatabaseInfo] = useState<NotionDatabase | null>(null);
  const [tasks, setTasks] = useState<NotionTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  return {
    databaseInfo,
    setDatabaseInfo,
    tasks,
    setTasks,
    tasksLoading,
    setTasksLoading,
  };
};

const useTaskCreation = () => {
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
  });

  const resetTask = useCallback(() => {
    setNewTask({
      title: '',
      description: '',
      status: 'Not Started',
      priority: 'Medium',
    });
    setShowCreateTask(false);
  }, []);

  return {
    showCreateTask,
    setShowCreateTask,
    newTask,
    setNewTask,
    resetTask,
  };
};

// ===== ユーティリティ関数 =====
const extractDatabaseId = (url: string): string | null => {
  try {
    const patterns = [
      /https:\/\/www\.notion\.so\/[^\/]+\/([a-zA-Z0-9]{32})\?/,
      /https:\/\/www\.notion\.so\/([a-zA-Z0-9]{32})\?/,
      /https:\/\/notion\.so\/[^\/]+\/([a-zA-Z0-9]{32})\?/,
      /https:\/\/notion\.so\/([a-zA-Z0-9]{32})\?/,
      /https:\/\/www\.notion\.so\/[^\/]+\/([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})\?/,
      /https:\/\/www\.notion\.so\/([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})\?/,
      /https:\/\/notion\.so\/[^\/]+\/([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})\?/,
      /https:\/\/notion\.so\/([a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12})\?/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    const cleanLastPart = lastPart.split('?')[0];
    
    if (/^[a-zA-Z0-9]{32}$/.test(cleanLastPart)) {
      return cleanLastPart;
    }
    
    if (/^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{4}-[a-zA-Z0-9]{12}$/.test(cleanLastPart)) {
      return cleanLastPart;
    }

    return null;
  } catch (error) {
    console.error('Error extracting database ID:', error);
    return null;
  }
};

// ===== API関数 =====
const notionApi = {
  async testConnection(formData: NotionFormData): Promise<ApiResponse<NotionTestResponse>> {
    const response = await apiFetch<ApiResponse<NotionTestResponse>>('/api/notion/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return response;
  },

  async fetchTasks(formData: NotionFormData): Promise<ApiResponse<NotionTasksResponse>> {
    const response = await apiFetch<ApiResponse<NotionTasksResponse>>('/api/notion/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    return response;
  },

  async saveGuildSettings(guildId: string, settings: Partial<GuildConfig>): Promise<ApiResponse<GuildConfig>> {
    const response = await apiFetch<ApiResponse<GuildConfig>>('/api/guilds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: guildId, ...settings }),
    });
    return response;
  },
};

// ===== UIコンポーネント =====
const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>読み込み中...</CardTitle>
        <CardDescription>サーバー設定を取得しています</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <LoadingSpinner size="lg" className="mx-auto" />
      </CardContent>
    </Card>
  </div>
);

const ErrorState = ({ error, onBackToGuilds, onBackToLogin }: {
  error: string;
  onBackToGuilds: () => void;
  onBackToLogin: () => void;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>エラー</CardTitle>
        <CardDescription>サーバー設定の取得に失敗しました</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4 text-center space-y-2">
          <Button onClick={onBackToGuilds} variant="outline" className="w-full">
            サーバー選択に戻る
          </Button>
          <Button onClick={onBackToLogin} variant="ghost" className="w-full">
            ログインページに戻る
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

const NotionSettingsForm = ({ 
  notionApiKey, 
  setNotionApiKey, 
  notionDatabaseUrl, 
  notionDatabaseId, 
  isExtractingId,
  onDatabaseUrlChange,
  onSave,
  onTest,
  saving,
  testing,
}: {
  notionApiKey: string;
  setNotionApiKey: (value: string) => void;
  notionDatabaseUrl: string;
  notionDatabaseId: string;
  isExtractingId: boolean;
  onDatabaseUrlChange: (url: string) => void;
  onSave: () => void;
  onTest: () => void;
  saving: boolean;
  testing: boolean;
}) => (
  <Card className="card-modern">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <span className="text-2xl">⚙️</span>
        Notion設定
      </CardTitle>
      <CardDescription>
        Notion APIキーとデータベースIDを設定して連携を有効にします
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Label htmlFor="notion-api-key">Notion APIキー</Label>
        <Input
          id="notion-api-key"
          type="password"
          placeholder="ntn_... または secret_..."
          value={notionApiKey}
          onChange={(e) => setNotionApiKey(e.target.value)}
          className="input-modern"
        />
        <p className="text-sm text-gray-500 mt-1">
          <a 
            href="https://www.notion.so/my-integrations" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Notionインテグレーション設定
          </a>
          から取得できます（ntn_ または secret_ で始まるキー）
        </p>
      </div>

      <div>
        <Label htmlFor="notion-database-url">データベースURL</Label>
        <Input
          id="notion-database-url"
          placeholder="https://www.notion.so/workspace/database-id"
          value={notionDatabaseUrl}
          onChange={(e) => onDatabaseUrlChange(e.target.value)}
          className="input-modern"
        />
        <p className="text-sm text-gray-500 mt-1">
          NotionデータベースのURLを入力してください
        </p>
        <div className="text-xs text-gray-400 mt-1 space-y-1">
          <p>例: https://www.notion.so/workspace/1234567890abcdef1234567890abcdef?v=...</p>
          <p>または: https://notion.so/workspace/12345678-1234-1234-1234-123456789012?v=...</p>
        </div>
        {isExtractingId && (
          <div className="flex items-center gap-2 mt-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-blue-600">IDを抽出中...</span>
          </div>
        )}
        {notionDatabaseId && !isExtractingId && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800 font-medium">抽出されたデータベースID:</p>
            <p className="text-xs font-mono text-green-700 mt-1 break-all">{notionDatabaseId}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={onSave}
          disabled={saving}
          className="btn-primary flex-1"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              保存中...
            </div>
          ) : (
            '設定を保存'
          )}
        </Button>
        <Button
          onClick={onTest}
          disabled={testing || !notionApiKey || !notionDatabaseId}
          variant="outline"
          className="btn-secondary"
        >
          {testing ? (
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              テスト中...
            </div>
          ) : (
            '接続テスト'
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
);

const DatabaseInfo = ({ 
  databaseInfo, 
  notionDatabaseUrl 
}: { 
  databaseInfo: NotionDatabase | null; 
  notionDatabaseUrl: string; 
}) => (
  <Card className="card-modern">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <span className="text-2xl">📝</span>
        データベース情報
      </CardTitle>
      <CardDescription>
        Notionデータベースの詳細情報
      </CardDescription>
    </CardHeader>
    <CardContent>
      {databaseInfo ? (
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">データベース名</Label>
            <p className="text-lg font-semibold">{databaseInfo.title}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700">データベースID</Label>
            <p className="text-sm font-mono bg-gray-100 p-2 rounded">{databaseInfo.id}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">元のURL</Label>
            <p className="text-sm text-blue-600 break-all">{notionDatabaseUrl}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-700">プロパティ</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.keys(databaseInfo.properties).map((key) => (
                <Badge key={key} variant="secondary">
                  {key}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            onClick={() => window.open(databaseInfo.url, '_blank')}
            variant="outline"
            className="btn-secondary w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Notionで開く
          </Button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📝</span>
          </div>
          <p className="text-gray-500">
            接続テストを実行してデータベース情報を表示
          </p>
        </div>
      )}
    </CardContent>
  </Card>
);

const TaskManagement = ({ 
  databaseInfo,
  tasks,
  tasksLoading,
  showCreateTask,
  newTask,
  onFetchTasks,
  onCreateTask,
  onShowCreateTask,
  onHideCreateTask,
  onUpdateNewTask,
  saving,
}: {
  databaseInfo: NotionDatabase | null;
  tasks: NotionTask[];
  tasksLoading: boolean;
  showCreateTask: boolean;
  newTask: CreateTaskRequest;
  onFetchTasks: () => void;
  onCreateTask: () => void;
  onShowCreateTask: () => void;
  onHideCreateTask: () => void;
  onUpdateNewTask: (task: CreateTaskRequest) => void;
  saving: boolean;
}) => {
  if (!databaseInfo) return null;

  return (
    <Card className="card-modern mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📋</span>
              タスク管理
            </CardTitle>
            <CardDescription>
              Notionデータベースのタスクを管理
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onFetchTasks}
              disabled={tasksLoading}
              variant="outline"
              className="btn-secondary"
            >
              {tasksLoading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  更新中...
                </div>
              ) : (
                '更新'
              )}
            </Button>
            <Button
              onClick={onShowCreateTask}
              className="btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              新規タスク
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showCreateTask ? (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold">新規タスク作成</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="task-title">タイトル *</Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => onUpdateNewTask({ ...newTask, title: e.target.value })}
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="task-status">ステータス</Label>
                <select
                  id="task-status"
                  value={newTask.status}
                  onChange={(e) => onUpdateNewTask({ ...newTask, status: e.target.value })}
                  className="input-modern"
                >
                  <option value="Not Started">未開始</option>
                  <option value="In Progress">進行中</option>
                  <option value="Done">完了</option>
                  <option value="On Hold">保留</option>
                </select>
              </div>
              <div>
                <Label htmlFor="task-priority">優先度</Label>
                <select
                  id="task-priority"
                  value={newTask.priority}
                  onChange={(e) => onUpdateNewTask({ ...newTask, priority: e.target.value })}
                  className="input-modern"
                >
                  <option value="Low">低</option>
                  <option value="Medium">中</option>
                  <option value="High">高</option>
                  <option value="Urgent">緊急</option>
                </select>
              </div>
              <div>
                <Label htmlFor="task-assignee">担当者</Label>
                <Input
                  id="task-assignee"
                  value={newTask.assignee || ''}
                  onChange={(e) => onUpdateNewTask({ ...newTask, assignee: e.target.value })}
                  className="input-modern"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="task-description">説明</Label>
              <textarea
                id="task-description"
                value={newTask.description || ''}
                onChange={(e) => onUpdateNewTask({ ...newTask, description: e.target.value })}
                className="input-modern w-full h-24 resize-none"
                placeholder="タスクの詳細を入力..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={onCreateTask}
                disabled={saving || !newTask.title.trim()}
                className="btn-primary"
              >
                {saving ? '作成中...' : 'タスクを作成'}
              </Button>
              <Button
                onClick={onHideCreateTask}
                variant="outline"
                className="btn-secondary"
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.length > 0 ? (
              <div className="grid gap-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          {task.status && (
                            <Badge variant="outline">{task.status}</Badge>
                          )}
                          {task.priority && (
                            <Badge variant="outline">{task.priority}</Badge>
                          )}
                          {task.assignee && (
                            <Badge variant="secondary">@{task.assignee}</Badge>
                          )}
                        </div>
                        {task.dueDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            期限: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => window.open(task.url, '_blank')}
                        variant="ghost"
                        size="sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-gray-500 mb-4">
                  タスクがありません
                </p>
                <Button
                  onClick={onFetchTasks}
                  className="btn-primary"
                >
                  タスク一覧を取得
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const HelpSection = () => (
  <Card className="card-modern mt-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <span className="text-xl">❓</span>
        よくある問題と解決方法
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">1. APIキーが無効な場合</h4>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Notionインテグレーション設定</a>でAPIキーを再生成</li>
            <li>• APIキーが「ntn_」または「secret_」で始まっていることを確認</li>
            <li>• インテグレーションが有効になっていることを確認</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">2. データベースが見つからない場合</h4>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• データベースURLが正しいことを確認</li>
            <li>• データベースが存在し、アクセス権限があることを確認</li>
            <li>• インテグレーションをデータベースに追加</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">3. アクセス権限がない場合</h4>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• データベースの右上「...」→「Add connections」</li>
            <li>• 作成したインテグレーションを選択</li>
            <li>• 「Confirm」をクリック</li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 mb-2">4. データベースの推奨構造</h4>
          <ul className="text-sm text-gray-600 space-y-1 ml-4">
            <li>• Name（タイトル）プロパティ</li>
            <li>• Status（ステータス）プロパティ（Select）</li>
            <li>• Priority（優先度）プロパティ（Select）</li>
            <li>• Assignee（担当者）プロパティ（People）</li>
            <li>• Due Date（期限）プロパティ（Date）</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ===== メインコンポーネント =====
export default function NotionSettingsPage() {
  const params = useParams<{ guildId: string }>();
  const router = useRouter();
  const guildId = params.guildId;
  
  // カスタムフック
  const {
    guildConfig,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchGuildConfig,
  } = useNotionSettings(guildId);

  const {
    notionApiKey,
    setNotionApiKey,
    notionDatabaseUrl,
    setNotionDatabaseUrl,
    notionDatabaseId,
    setNotionDatabaseId,
    isExtractingId,
    setIsExtractingId,
  } = useNotionForm(guildConfig);

  const {
    databaseInfo,
    setDatabaseInfo,
    tasks,
    setTasks,
    tasksLoading,
    setTasksLoading,
  } = useNotionDatabase();

  const {
    showCreateTask,
    setShowCreateTask,
    newTask,
    setNewTask,
    resetTask,
  } = useTaskCreation();

  // 状態
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // メモ化された値
  const formData = useMemo(() => ({
    apiKey: notionApiKey,
    databaseId: notionDatabaseId,
  }), [notionApiKey, notionDatabaseId]);

  // イベントハンドラー
  const handleDatabaseUrlChange = useCallback((url: string) => {
    setNotionDatabaseUrl(url);
    
    if (url.trim()) {
      setIsExtractingId(true);
      
      setTimeout(() => {
        const extractedId = extractDatabaseId(url);
        if (extractedId) {
          setNotionDatabaseId(extractedId);
          setSuccess('データベースIDを自動抽出しました');
        } else {
          setNotionDatabaseId('');
          setError('有効なNotionデータベースURLを入力してください');
        }
        setIsExtractingId(false);
      }, 500);
    } else {
      setNotionDatabaseId('');
      setIsExtractingId(false);
    }
  }, [setNotionDatabaseUrl, setNotionDatabaseId, setSuccess, setError, setIsExtractingId]);

  const handleSaveSettings = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const result = await notionApi.saveGuildSettings(guildId, {
        notion_api_key: notionApiKey,
        notion_database_id: notionDatabaseId,
        updated_at: new Date().toISOString(),
      });

      if (!result.success) {
        setError(result.error || '設定の保存に失敗しました');
        return;
      }

      setSuccess('Notion設定を保存しました');
      fetchGuildConfig();
    } catch (err) {
      errorHandler.logError(err as Error, 'save-notion-settings');
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }, [guildId, notionApiKey, notionDatabaseId, setError, setSuccess, fetchGuildConfig]);

  const handleTestConnection = useCallback(async () => {
    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      if (!notionApiKey || !notionDatabaseId) {
        setError('APIキーとデータベースIDを入力してください');
        return;
      }

      const result = await notionApi.testConnection({ apiKey: notionApiKey, databaseId: notionDatabaseId });

      if (!result.success) {
        throw new Error(result.error || '接続テストに失敗しました');
      }

      setDatabaseInfo(result.data!.database);
      setSuccess('Notionとの接続が正常に確認されました');
    } catch (err) {
      errorHandler.logError(err as Error, 'test-notion-connection');
      
      if (err instanceof AppError) {
        let detailedMessage = err.message;
        
        if (err.code === 'NOTION_INVALID_KEY') {
          detailedMessage = 'Notion APIキーが無効です。以下を確認してください：\n• APIキー（ntn_ または secret_ で始まる）が正しくコピーされているか\n• インテグレーションが有効になっているか\n• データベースにインテグレーションが追加されているか';
        } else if (err.code === 'NOTION_DATABASE_NOT_FOUND') {
          detailedMessage = 'データベースが見つかりません。以下を確認してください：\n• データベースIDが正しいか\n• データベースが存在するか\n• インテグレーションがデータベースにアクセス権限を持っているか';
        } else if (err.code === 'NOTION_API_ERROR') {
          detailedMessage = `Notion API エラー: ${err.message}\n\n詳細: ${JSON.stringify(err.details, null, 2)}`;
        } else if (err.code === 'NOTION_NETWORK_ERROR') {
          detailedMessage = 'ネットワークエラーが発生しました。以下を確認してください：\n• インターネット接続が正常か\n• ファイアウォールやプロキシの設定\n• Notion APIが利用可能か';
        }
        
        setError(detailedMessage);
      } else {
        setError('接続テストに失敗しました');
      }
    } finally {
      setTesting(false);
    }
  }, [notionApiKey, notionDatabaseId, setError, setSuccess, setDatabaseInfo]);

  const handleFetchTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setError(null);

      if (!notionApiKey || !notionDatabaseId) {
        setError('APIキーとデータベースIDを設定してください');
        return;
      }

      const result = await notionApi.fetchTasks({ apiKey: notionApiKey, databaseId: notionDatabaseId });
      
      if (!result.success) {
        throw new Error(result.error || 'タスク一覧の取得に失敗しました');
      }
      
      setTasks(result.data!.tasks || []);
    } catch (err) {
      errorHandler.logError(err as Error, 'fetch-notion-tasks');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスク一覧の取得に失敗しました');
      }
    } finally {
      setTasksLoading(false);
    }
  }, [notionApiKey, notionDatabaseId, setTasksLoading, setError, setTasks]);

  const handleCreateTask = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      if (!notionApiKey || !notionDatabaseId) {
        setError('APIキーとデータベースIDを設定してください');
        return;
      }

      if (!newTask.title.trim()) {
        setError('タスクタイトルを入力してください');
        return;
      }

      const notionClient = createNotionClient(notionApiKey, notionDatabaseId);
      await notionClient.createTask(newTask);
      
      setSuccess('タスクを作成しました');
      resetTask();
      handleFetchTasks();
    } catch (err) {
      errorHandler.logError(err as Error, 'create-notion-task');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスクの作成に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }, [notionApiKey, notionDatabaseId, newTask, setError, setSuccess, resetTask, handleFetchTasks]);

  // ローディング状態
  if (loading) {
    return <LoadingState />;
  }

  // エラー状態
  if (error && !guildConfig) {
    return (
      <ErrorState
        error={error}
        onBackToGuilds={() => router.push('/dashboard/select-guild')}
        onBackToLogin={() => router.push('/auth/login')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Notion設定</h1>
                <p className="text-xs sm:text-sm text-gray-600">Notion API連携の設定と管理</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* エラー・成功メッセージ */}
        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertDescription className="whitespace-pre-line">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 animate-fade-in">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 設定フォーム */}
          <NotionSettingsForm
            notionApiKey={notionApiKey}
            setNotionApiKey={setNotionApiKey}
            notionDatabaseUrl={notionDatabaseUrl}
            notionDatabaseId={notionDatabaseId}
            isExtractingId={isExtractingId}
            onDatabaseUrlChange={handleDatabaseUrlChange}
            onSave={handleSaveSettings}
            onTest={handleTestConnection}
            saving={saving}
            testing={testing}
          />

          {/* データベース情報 */}
          <DatabaseInfo
            databaseInfo={databaseInfo}
            notionDatabaseUrl={notionDatabaseUrl}
          />
        </div>

        {/* タスク管理 */}
        <TaskManagement
          databaseInfo={databaseInfo}
          tasks={tasks}
          tasksLoading={tasksLoading}
          showCreateTask={showCreateTask}
          newTask={newTask}
          onFetchTasks={handleFetchTasks}
          onCreateTask={handleCreateTask}
          onShowCreateTask={() => setShowCreateTask(true)}
          onHideCreateTask={() => setShowCreateTask(false)}
          onUpdateNewTask={setNewTask}
          saving={saving}
        />

        {/* ヘルプセクション */}
        <HelpSection />
      </div>
    </div>
  );
} 