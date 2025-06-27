import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createNotionClient, CreateTaskRequest } from '@/lib/notion';
import { errorHandler, AppError, ERROR_CODES } from '@/lib/error-handler';

export async function POST(request: NextRequest) {
  try {
    const { guildId, taskData } = await request.json();

    // バリデーション
    if (!guildId) {
      throw errorHandler.createError(
        'DiscordサーバーIDが必要です',
        'VALIDATION_ERROR',
        { guildId: !!guildId }
      );
    }

    if (!taskData || !taskData.title) {
      throw errorHandler.createError(
        'タスクタイトルが必要です',
        'VALIDATION_ERROR',
        { taskData: !!taskData, title: !!taskData?.title }
      );
    }

    // サーバー設定を取得
    const guildResult = await errorHandler.handleAsync(
      async () => {
        const { data, error } = await supabase
          .from('guilds')
          .select('notion_api_key, notion_database_id')
          .eq('guild_id', guildId)
          .single();

        if (error) throw error;
        if (!data) {
          throw errorHandler.createError(
            'サーバー設定が見つかりません',
            'DISCORD_GUILD_NOT_FOUND',
            { guildId }
          );
        }

        if (!data.notion_api_key || !data.notion_database_id) {
          throw errorHandler.createError(
            'Notion設定が完了していません',
            'NOTION_NOT_CONFIGURED',
            { guildId }
          );
        }

        return data;
      },
      'fetch-guild-notion-config'
    );

    if (!guildResult.success) {
      return NextResponse.json(
        { error: guildResult.error },
        { status: 400 }
      );
    }

    const guildConfig = guildResult.data;

    // Notionクライアントを作成
    const notionClient = createNotionClient(
      guildConfig.notion_api_key,
      guildConfig.notion_database_id
    );

    // タスクを作成
    const createTaskResult = await errorHandler.handleAsync(
      async () => {
        const taskRequest: CreateTaskRequest = {
          title: taskData.title,
          description: taskData.description,
          status: taskData.status || 'Not Started',
          priority: taskData.priority || 'Medium',
          assignee: taskData.assignee,
          dueDate: taskData.dueDate,
          tags: taskData.tags,
        };

        return await notionClient.createTask(taskRequest);
      },
      'create-notion-task'
    );

    if (!createTaskResult.success) {
      return NextResponse.json(
        { error: createTaskResult.error },
        { status: 400 }
      );
    }

    const createdTask = createTaskResult.data;

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'タスクが正常に作成されました',
      task: {
        id: createdTask.id,
        title: createdTask.title,
        status: createdTask.status,
        priority: createdTask.priority,
        assignee: createdTask.assignee,
        dueDate: createdTask.dueDate,
        url: createdTask.url,
        createdTime: createdTask.createdTime,
      }
    });

  } catch (error) {
    errorHandler.logError(error as Error, 'discord-notion-api');
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'タスクの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// タスク一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guildId = searchParams.get('guildId');
    const status = searchParams.get('status');
    const assignee = searchParams.get('assignee');

    // バリデーション
    if (!guildId) {
      throw errorHandler.createError(
        'DiscordサーバーIDが必要です',
        'VALIDATION_ERROR'
      );
    }

    // サーバー設定を取得
    const guildResult = await errorHandler.handleAsync(
      async () => {
        const { data, error } = await supabase
          .from('guilds')
          .select('notion_api_key, notion_database_id')
          .eq('guild_id', guildId)
          .single();

        if (error) throw error;
        if (!data) {
          throw errorHandler.createError(
            'サーバー設定が見つかりません',
            'DISCORD_GUILD_NOT_FOUND'
          );
        }

        if (!data.notion_api_key || !data.notion_database_id) {
          throw errorHandler.createError(
            'Notion設定が完了していません',
            'NOTION_NOT_CONFIGURED'
          );
        }

        return data;
      },
      'fetch-guild-notion-config'
    );

    if (!guildResult.success) {
      return NextResponse.json(
        { error: guildResult.error },
        { status: 400 }
      );
    }

    const guildConfig = guildResult.data;

    // Notionクライアントを作成
    const notionClient = createNotionClient(
      guildConfig.notion_api_key,
      guildConfig.notion_database_id
    );

    // フィルターを構築
    let filters: any = undefined;
    if (status || assignee) {
      filters = {
        and: [
          ...(status ? [{
            property: 'Status',
            select: { equals: status }
          }] : []),
          ...(assignee ? [{
            property: 'Assign',
            people: { contains: assignee }
          }] : [])
        ]
      };
    }

    // タスク一覧を取得
    const tasksResult = await errorHandler.handleAsync(
      async () => {
        return await notionClient.getTasks(filters);
      },
      'fetch-notion-tasks'
    );

    if (!tasksResult.success) {
      return NextResponse.json(
        { error: tasksResult.error },
        { status: 400 }
      );
    }

    const tasks = tasksResult.data;

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'タスク一覧を取得しました',
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee,
        dueDate: task.dueDate,
        url: task.url,
        createdTime: task.createdTime,
        lastEditedTime: task.lastEditedTime,
      })),
      count: tasks.length
    });

  } catch (error) {
    errorHandler.logError(error as Error, 'discord-notion-api-get');
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'タスク一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// タスク更新
export async function PATCH(request: NextRequest) {
  try {
    const { guildId, taskId, taskData } = await request.json();

    // バリデーション
    if (!guildId || !taskId) {
      throw errorHandler.createError(
        'DiscordサーバーIDとタスクIDが必要です',
        'VALIDATION_ERROR',
        { guildId: !!guildId, taskId: !!taskId }
      );
    }

    // サーバー設定を取得
    const guildResult = await errorHandler.handleAsync(
      async () => {
        const { data, error } = await supabase
          .from('guilds')
          .select('notion_api_key, notion_database_id')
          .eq('guild_id', guildId)
          .single();

        if (error) throw error;
        if (!data) {
          throw errorHandler.createError(
            'サーバー設定が見つかりません',
            'DISCORD_GUILD_NOT_FOUND'
          );
        }

        if (!data.notion_api_key || !data.notion_database_id) {
          throw errorHandler.createError(
            'Notion設定が完了していません',
            'NOTION_NOT_CONFIGURED'
          );
        }

        return data;
      },
      'fetch-guild-notion-config'
    );

    if (!guildResult.success) {
      return NextResponse.json(
        { error: guildResult.error },
        { status: 400 }
      );
    }

    const guildConfig = guildResult.data;

    // Notionクライアントを作成
    const notionClient = createNotionClient(
      guildConfig.notion_api_key,
      guildConfig.notion_database_id
    );

    // タスクを更新
    const updateTaskResult = await errorHandler.handleAsync(
      async () => {
        return await notionClient.updateTask(taskId, taskData);
      },
      'update-notion-task'
    );

    if (!updateTaskResult.success) {
      return NextResponse.json(
        { error: updateTaskResult.error },
        { status: 400 }
      );
    }

    const updatedTask = updateTaskResult.data;

    // 成功レスポンス
    return NextResponse.json({
      success: true,
      message: 'タスクが正常に更新されました',
      task: {
        id: updatedTask.id,
        title: updatedTask.title,
        status: updatedTask.status,
        priority: updatedTask.priority,
        assignee: updatedTask.assignee,
        dueDate: updatedTask.dueDate,
        url: updatedTask.url,
        lastEditedTime: updatedTask.lastEditedTime,
      }
    });

  } catch (error) {
    errorHandler.logError(error as Error, 'discord-notion-api-patch');
    
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'タスクの更新に失敗しました' },
      { status: 500 }
    );
  }
} 