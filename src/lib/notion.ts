import { errorHandler, AppError, ERROR_CODES } from './error-handler.ts';

// Notion APIの型定義
export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  properties: Record<string, NotionProperty>;
}

export interface NotionProperty {
  id: string;
  type: string;
  name: string;
  options?: NotionSelectOption[];
}

export interface NotionSelectOption {
  id: string;
  name: string;
  color: string;
}

export interface NotionTask {
  id: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  createdTime: string;
  lastEditedTime: string;
  url: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  dueDate?: string;
  tags?: string[];
}

// Notion API クライアント
export class NotionClient {
  private apiKey: string;
  private databaseId: string;
  private baseUrl = 'https://api.notion.com/v1';

  constructor(apiKey: string, databaseId: string) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
  }

  // ヘッダーの生成
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  // データベース情報の取得
  async getDatabase(): Promise<NotionDatabase> {
    try {
      console.log('Fetching database info for:', this.databaseId);
      console.log('API Key prefix:', this.apiKey.substring(0, 10) + '...');
      
      const response = await errorHandler.retry(
        async () => {
          console.log('Making request to:', `${this.baseUrl}/databases/${this.databaseId}`);
          console.log('Request headers:', this.getHeaders());
          
          const res = await fetch(`${this.baseUrl}/databases/${this.databaseId}`, {
            method: 'GET',
            headers: this.getHeaders(),
          });

          console.log('Database API response status:', res.status);
          console.log('Database API response headers:', Object.fromEntries(res.headers.entries()));

          if (!res.ok) {
            const errorText = await res.text();
            console.error('Database API error response:', errorText);
            console.error('Full error details:', {
              status: res.status,
              statusText: res.statusText,
              url: res.url,
              headers: Object.fromEntries(res.headers.entries()),
              body: errorText
            });
            
            if (res.status === 401) {
              throw errorHandler.createError(
                'Notion APIキーが無効です。APIキー（ntn_ または secret_ で始まる）を確認してください。',
                'NOTION_INVALID_KEY',
                { status: res.status, response: errorText }
              );
            } else if (res.status === 404) {
              throw errorHandler.createError(
                'データベースが見つかりません。データベースIDとインテグレーションの設定を確認してください。',
                'NOTION_DATABASE_NOT_FOUND',
                { status: res.status, databaseId: this.databaseId, response: errorText }
              );
            } else if (res.status === 403) {
              throw errorHandler.createError(
                'データベースへのアクセス権限がありません。インテグレーションをデータベースに追加してください。',
                'NOTION_API_ERROR',
                { status: res.status, response: errorText }
              );
            } else {
              throw errorHandler.createError(
                `Notion API エラー: ${res.status} ${res.statusText}`,
                'NOTION_API_ERROR',
                { status: res.status, statusText: res.statusText, response: errorText }
              );
            }
          }

          return res;
        },
        3,
        1000,
        'notion-get-database'
      );

      const data = await response.json();
      console.log('Database info received:', { id: data.id, title: data.title?.[0]?.plain_text });
      
      return {
        id: data.id,
        title: data.title?.[0]?.plain_text || 'Untitled',
        url: data.url,
        properties: data.properties,
      };
    } catch (error) {
      console.error('Error in getDatabase:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        apiKey: this.apiKey.substring(0, 10) + '...',
        databaseId: this.databaseId
      });
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // ネットワークエラーの場合
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw errorHandler.createError(
          'ネットワークエラーが発生しました。インターネット接続を確認してください。',
          'NOTION_NETWORK_ERROR',
          { originalError: error }
        );
      }
      
      throw errorHandler.createError(
        'データベース情報の取得に失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // タスク一覧の取得
  async getTasks(filters?: any): Promise<NotionTask[]> {
    try {
      const response = await errorHandler.retry(
        async () => {
          // 最小限のリクエストボディ
          const requestBody = {
            page_size: 100
          };

          const res = await fetch(`${this.baseUrl}/databases/${this.databaseId}/query`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            if (res.status === 401) {
              throw errorHandler.createError(
                'Notion APIキーが無効です',
                'NOTION_INVALID_KEY',
                { status: res.status }
              );
            } else {
              throw errorHandler.createError(
                `Notion API エラー: ${res.status} ${res.statusText}`,
                'NOTION_API_ERROR',
                { status: res.status, statusText: res.statusText }
              );
            }
          }

          return res;
        },
        3,
        1000,
        'notion-get-tasks'
      );

      const data = await response.json();
      
      // クライアント側で作成日時順にソート
      const tasks: NotionTask[] = data.results.map((page: any) => this.parseTaskPage(page));
      return tasks.sort((a: NotionTask, b: NotionTask) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw errorHandler.createError(
        'タスク一覧の取得に失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // タスクの作成
  async createTask(taskData: CreateTaskRequest): Promise<NotionTask> {
    try {
      const properties = this.buildTaskProperties(taskData);
      
      const response = await errorHandler.retry(
        async () => {
          const requestBody = {
            parent: { database_id: this.databaseId },
            properties,
            children: taskData.description ? [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      type: 'text',
                      text: { content: taskData.description },
                    },
                  ],
                },
              },
            ] : [],
          };

          const res = await fetch(`${this.baseUrl}/pages`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            if (res.status === 401) {
              throw errorHandler.createError(
                'Notion APIキーが無効です',
                'NOTION_INVALID_KEY',
                { status: res.status }
              );
            } else {
              throw errorHandler.createError(
                `Notion API エラー: ${res.status} ${res.statusText}`,
                'NOTION_API_ERROR',
                { status: res.status, statusText: res.statusText }
              );
            }
          }

          return res;
        },
        3,
        1000,
        'notion-create-task'
      );

      const data = await response.json();
      return this.parseTaskPage(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw errorHandler.createError(
        'タスクの作成に失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // タスクの更新
  async updateTask(taskId: string, taskData: UpdateTaskRequest): Promise<NotionTask> {
    try {
      const properties = this.buildTaskProperties(taskData);
      
      const response = await errorHandler.retry(
        async () => {
          const requestBody = { properties };

          const res = await fetch(`${this.baseUrl}/pages/${taskId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            if (res.status === 401) {
              throw errorHandler.createError(
                'Notion APIキーが無効です',
                'NOTION_INVALID_KEY',
                { status: res.status }
              );
            } else if (res.status === 404) {
              throw errorHandler.createError(
                'タスクが見つかりません',
                'NOTION_API_ERROR',
                { status: res.status, taskId }
              );
            } else {
              throw errorHandler.createError(
                `Notion API エラー: ${res.status} ${res.statusText}`,
                'NOTION_API_ERROR',
                { status: res.status, statusText: res.statusText }
              );
            }
          }

          return res;
        },
        3,
        1000,
        'notion-update-task'
      );

      const data = await response.json();
      return this.parseTaskPage(data);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw errorHandler.createError(
        'タスクの更新に失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // タスクの削除
  async deleteTask(taskId: string): Promise<void> {
    try {
      await errorHandler.retry(
        async () => {
          const requestBody = {
            archived: true,
          };

          const res = await fetch(`${this.baseUrl}/pages/${taskId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(requestBody),
          });

          if (!res.ok) {
            if (res.status === 401) {
              throw errorHandler.createError(
                'Notion APIキーが無効です',
                'NOTION_INVALID_KEY',
                { status: res.status }
              );
            } else if (res.status === 404) {
              throw errorHandler.createError(
                'タスクが見つかりません',
                'NOTION_API_ERROR',
                { status: res.status, taskId }
              );
            } else {
              throw errorHandler.createError(
                `Notion API エラー: ${res.status} ${res.statusText}`,
                'NOTION_API_ERROR',
                { status: res.status, statusText: res.statusText }
              );
            }
          }

          return res;
        },
        3,
        1000,
        'notion-delete-task'
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw errorHandler.createError(
        'タスクの削除に失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // 接続テスト
  async testConnection(): Promise<{ success: true; database: NotionDatabase }> {
    try {
      const database = await this.getDatabase();
      return { success: true, database };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw errorHandler.createError(
        'Notionとの接続テストに失敗しました',
        'NOTION_API_ERROR',
        { originalError: error }
      );
    }
  }

  // タスクページの解析
  private parseTaskPage(page: any): NotionTask {
    const properties = page.properties;
    let description = '';
    if (page.properties.Description && page.properties.Description.rich_text?.[0]?.plain_text) {
      description = page.properties.Description.rich_text[0].plain_text;
    } else if (page.children && page.children[0]?.paragraph?.rich_text?.[0]?.plain_text) {
      description = page.children[0].paragraph.rich_text[0].plain_text;
    }
    return {
      id: page.id,
      title: properties.Name?.title?.[0]?.plain_text || 'Untitled',
      description,
      status: properties.Status?.select?.name,
      priority: properties.Priority?.select?.name,
      assignee: properties.Assignee?.people?.[0]?.name,
      dueDate: properties['Due Date']?.date?.start,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      url: page.url,
    };
  }

  // タスクプロパティの構築
  private buildTaskProperties(taskData: CreateTaskRequest | UpdateTaskRequest): any {
    const properties: any = {};

    if (taskData.title) {
      properties.Name = {
        title: [
          {
            type: 'text',
            text: { content: taskData.title },
          },
        ],
      };
    }

    if (taskData.status) {
      properties.Status = {
        select: { name: taskData.status },
      };
    }

    if (taskData.priority) {
      properties.Priority = {
        select: { name: taskData.priority },
      };
    }

    if (taskData.assignee) {
      properties.Assignee = {
        people: [{ name: taskData.assignee }],
      };
    }

    if (taskData.dueDate) {
      properties['Due Date'] = {
        date: { start: taskData.dueDate },
      };
    }

    if (taskData.tags && taskData.tags.length > 0) {
      properties.Tags = {
        multi_select: taskData.tags.map(tag => ({ name: tag })),
      };
    }

    return properties;
  }
}

// 便利な関数
export function createNotionClient(apiKey: string, databaseId: string): NotionClient {
  return new NotionClient(apiKey, databaseId);
}

// デフォルトのタスクテンプレート
export const DEFAULT_TASK_TEMPLATE = {
  title: '新しいタスク',
  status: 'Not Started',
  priority: 'Medium',
  description: 'タスクの詳細をここに記入してください',
};

// ステータスオプション
export const STATUS_OPTIONS = [
  { name: 'Not Started', color: 'gray' },
  { name: 'In Progress', color: 'blue' },
  { name: 'Done', color: 'green' },
  { name: 'On Hold', color: 'yellow' },
  { name: 'Cancelled', color: 'red' },
];

// 優先度オプション
export const PRIORITY_OPTIONS = [
  { name: 'Low', color: 'gray' },
  { name: 'Medium', color: 'yellow' },
  { name: 'High', color: 'red' },
  { name: 'Urgent', color: 'red' },
]; 