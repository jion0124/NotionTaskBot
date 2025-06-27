'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { errorHandler, AppError, ERROR_CODES } from '@/lib/error-handler';
import { createNotionClient, NotionTask, CreateTaskRequest, UpdateTaskRequest } from '@/lib/notion';

interface GuildConfig {
  guild_id: string;
  guild_name: string;
  notion_api_key?: string;
  notion_database_id?: string;
}

interface TaskWithActions extends NotionTask {
  isEditing?: boolean;
  isDeleting?: boolean;
}

export default function TasksPage() {
  const params = useParams<{ guildId: string }>();
  const router = useRouter();
  const guildId = params.guildId as string;
  
  const [guildConfig, setGuildConfig] = useState<GuildConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // タスク管理
  const [tasks, setTasks] = useState<TaskWithActions[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  
  // フィルター
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // 新規タスク作成
  const [newTask, setNewTask] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'Not Started',
    priority: 'Medium',
  });

  // 編集用タスク
  const [editingTask, setEditingTask] = useState<UpdateTaskRequest>({});

  // サーバー設定取得
  const fetchGuildConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await errorHandler.handleAsync(
        async () => {
          const innerResult = await errorHandler.handleAsync(
            async () => {
              const response = await fetch(`/api/guilds/${guildId}`);
              if (!response.ok) throw new Error('サーバー設定の取得に失敗しました');
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

  // Notionクライアントの作成
  const createNotionClientInstance = useCallback(() => {
    if (!guildConfig?.notion_api_key || !guildConfig?.notion_database_id) {
      throw errorHandler.createError(
        'Notion設定が完了していません',
        'NOTION_NOT_CONFIGURED'
      );
    }
    return createNotionClient(guildConfig.notion_api_key, guildConfig.notion_database_id);
  }, [guildConfig]);

  // タスク一覧取得
  const fetchTasks = useCallback(async () => {
    try {
      setTasksLoading(true);
      setError(null);

      const notionClient = createNotionClientInstance();
      
      // フィルターを構築
      let filters: any = undefined;
      if (statusFilter || assigneeFilter) {
        filters = {
          and: [
            ...(statusFilter ? [{
              property: 'Status',
              select: { equals: statusFilter }
            }] : []),
            ...(assigneeFilter ? [{
              property: 'Assign',
              people: { contains: assigneeFilter }
            }] : [])
          ]
        };
      }

      const tasks = await notionClient.getTasks(filters);
      
      // 検索フィルターを適用
      const filteredTasks = searchTerm 
        ? tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : tasks;

      setTasks(filteredTasks.map(task => ({ ...task, isEditing: false, isDeleting: false })));
    } catch (err) {
      errorHandler.logError(err as Error, 'fetch-tasks');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスク一覧の取得に失敗しました');
      }
    } finally {
      setTasksLoading(false);
    }
  }, [createNotionClientInstance, statusFilter, assigneeFilter, searchTerm]);

  // 初回タスク取得
  useEffect(() => {
    if (guildConfig?.notion_api_key && guildConfig?.notion_database_id) {
      fetchTasks();
    }
  }, [guildConfig, fetchTasks]);

  // 新規タスク作成
  const createTask = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!newTask.title.trim()) {
        setError('タスクタイトルを入力してください');
        return;
      }

      const notionClient = createNotionClientInstance();
      await notionClient.createTask(newTask);
      
      setSuccess('タスクを作成しました');
      setNewTask({ title: '', description: '', status: 'Not Started', priority: 'Medium' });
      setShowCreateTask(false);
      fetchTasks(); // タスク一覧を更新
    } catch (err) {
      errorHandler.logError(err as Error, 'create-task');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスクの作成に失敗しました');
      }
    }
  };

  // タスク編集開始
  const startEditing = (task: TaskWithActions) => {
    setEditingTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
    });
    setTasks(tasks.map(t => 
      t.id === task.id ? { ...t, isEditing: true } : t
    ));
  };

  // タスク編集キャンセル
  const cancelEditing = (taskId: string) => {
    setEditingTask({});
    setTasks(tasks.map(t => 
      t.id === taskId ? { ...t, isEditing: false } : t
    ));
  };

  // タスク更新
  const updateTask = async (taskId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const notionClient = createNotionClientInstance();
      await notionClient.updateTask(taskId, editingTask);
      
      setSuccess('タスクを更新しました');
      setEditingTask({});
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, isEditing: false } : t
      ));
      fetchTasks(); // タスク一覧を更新
    } catch (err) {
      errorHandler.logError(err as Error, 'update-task');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスクの更新に失敗しました');
      }
    }
  };

  // タスク削除
  const deleteTask = async (taskId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const notionClient = createNotionClientInstance();
      await notionClient.deleteTask(taskId);
      
      setSuccess('タスクを削除しました');
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      errorHandler.logError(err as Error, 'delete-task');
      
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('タスクの削除に失敗しました');
      }
    }
  };

  // ステータスカラー取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 優先度カラー取得
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>読み込み中...</CardTitle>
            <CardDescription>
              サーバー設定を取得しています
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <LoadingSpinner size="lg" className="mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !guildConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>エラー</CardTitle>
            <CardDescription>
              サーバー設定の取得に失敗しました
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="mt-4 text-center space-y-2">
              <Button
                onClick={() => router.push('/dashboard/select-guild')}
                variant="outline"
                className="w-full"
              >
                サーバー選択に戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!guildConfig?.notion_api_key || !guildConfig?.notion_database_id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Notion設定が必要</CardTitle>
            <CardDescription>
              Notionとの連携設定を完了してください
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => router.push(`/dashboard/${guildId}/notion`)}
              className="btn-primary w-full"
            >
              Notion設定へ
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* ヘッダー */}
        <div className="page-header text-left">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title text-left mb-2">
                タスク管理
              </h1>
              <p className="page-description text-left">
                {guildConfig?.guild_name} - Notionタスクの管理
              </p>
            </div>
            <Button
              onClick={() => router.push(`/dashboard/${guildId}`)}
              variant="outline"
              className="btn-secondary btn-icon"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              ダッシュボードに戻る
            </Button>
          </div>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 animate-fade-in">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* フィルターと検索 */}
        <Card className="card-modern mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              フィルター・検索
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="search">検索</Label>
                <Input
                  id="search"
                  placeholder="タスク名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <Label htmlFor="status-filter">ステータス</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-modern"
                >
                  <option value="">すべて</option>
                  <option value="Not Started">未開始</option>
                  <option value="In Progress">進行中</option>
                  <option value="Done">完了</option>
                  <option value="On Hold">保留</option>
                  <option value="Cancelled">キャンセル</option>
                </select>
              </div>
              <div>
                <Label htmlFor="assignee-filter">担当者</Label>
                <Input
                  id="assignee-filter"
                  placeholder="担当者名..."
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="input-modern"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchTasks}
                  disabled={tasksLoading}
                  className="btn-primary w-full"
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* タスク一覧 */}
        <Card className="card-modern">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  タスク一覧 ({tasks.length})
                </CardTitle>
                <CardDescription>
                  Notionデータベースのタスクを管理
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateTask(true)}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新規タスク
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCreateTask ? (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg mb-6">
                <h3 className="font-semibold">新規タスク作成</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="task-title">タイトル *</Label>
                    <Input
                      id="task-title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <Label htmlFor="task-status">ステータス</Label>
                    <select
                      id="task-status"
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
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
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
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
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="input-modern"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="task-description">説明</Label>
                  <textarea
                    id="task-description"
                    value={newTask.description || ''}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="input-modern w-full h-24 resize-none"
                    placeholder="タスクの詳細を入力..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={createTask}
                    disabled={!newTask.title.trim()}
                    className="btn-primary"
                  >
                    タスクを作成
                  </Button>
                  <Button
                    onClick={() => setShowCreateTask(false)}
                    variant="outline"
                    className="btn-secondary"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : null}

            {tasksLoading ? (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" className="mx-auto" />
                <p className="text-gray-500 mt-4">タスクを読み込み中...</p>
              </div>
            ) : tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {task.isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>タイトル</Label>
                            <Input
                              value={editingTask.title || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                              className="input-modern"
                            />
                          </div>
                          <div>
                            <Label>ステータス</Label>
                            <select
                              value={editingTask.status || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                              className="input-modern"
                            >
                              <option value="Not Started">未開始</option>
                              <option value="In Progress">進行中</option>
                              <option value="Done">完了</option>
                              <option value="On Hold">保留</option>
                            </select>
                          </div>
                          <div>
                            <Label>優先度</Label>
                            <select
                              value={editingTask.priority || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                              className="input-modern"
                            >
                              <option value="Low">低</option>
                              <option value="Medium">中</option>
                              <option value="High">高</option>
                              <option value="Urgent">緊急</option>
                            </select>
                          </div>
                          <div>
                            <Label>担当者</Label>
                            <Input
                              value={editingTask.assignee || ''}
                              onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                              className="input-modern"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>説明</Label>
                          <textarea
                            value={editingTask.description || ''}
                            onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                            className="input-modern w-full h-24 resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => updateTask(task.id)}
                            className="btn-primary"
                          >
                            更新
                          </Button>
                          <Button
                            onClick={() => cancelEditing(task.id)}
                            variant="outline"
                            className="btn-secondary"
                          >
                            キャンセル
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{task.title}</h4>
                          {task.description && (
                            <p className="text-gray-600 mt-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            {task.status && (
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            )}
                            {task.priority && (
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            )}
                            {task.assignee && (
                              <Badge variant="secondary">@{task.assignee}</Badge>
                            )}
                          </div>
                          {task.dueDate && (
                            <p className="text-sm text-gray-500 mt-2">
                              期限: {new Date(task.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            作成: {new Date(task.createdTime).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => startEditing(task)}
                            variant="ghost"
                            size="sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            onClick={() => window.open(task.url, '_blank')}
                            variant="ghost"
                            size="sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Button>
                          <Button
                            onClick={() => deleteTask(task.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    )}
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
                  onClick={() => setShowCreateTask(true)}
                  className="btn-primary"
                >
                  最初のタスクを作成
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 