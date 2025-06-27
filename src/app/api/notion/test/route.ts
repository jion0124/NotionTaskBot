import { NextRequest, NextResponse } from 'next/server';
import { createNotionClient } from '@/lib/notion';
import { errorHandler } from '@/lib/error-handler';

// Node.js環境でのfetchの確認
if (typeof globalThis.fetch === 'undefined') {
  console.error('API route: fetch is not available in this environment');
}

export async function POST(request: NextRequest) {
  try {
    console.log('API route: Notion test connection started');
    console.log('API route: fetch available:', typeof globalThis.fetch !== 'undefined');
    
    const body = await request.json();
    const { apiKey, databaseId } = body;

    console.log('API route: Received request with:', {
      apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'undefined',
      databaseId: databaseId || 'undefined'
    });

    if (!apiKey || !databaseId) {
      console.error('API route: Missing required parameters');
      return NextResponse.json(
        { success: false, error: 'APIキーとデータベースIDが必要です' },
        { status: 400 }
      );
    }

    console.log('API route: Creating Notion client...');
    const notionClient = createNotionClient(apiKey, databaseId);
    
    console.log('API route: Testing connection...');
    const result = await notionClient.testConnection();

    console.log('API route: Connection test successful:', {
      databaseId: result.database.id,
      databaseTitle: result.database.title
    });

    return NextResponse.json({
      success: true,
      data: {
        database: result.database
      }
    });

  } catch (error) {
    console.error('API route: Error occurred:', error);
    console.error('API route: Error type:', typeof error);
    console.error('API route: Error constructor:', error?.constructor?.name);
    console.error('API route: Error message:', error instanceof Error ? error.message : 'No message');
    console.error('API route: Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    if (error instanceof Error) {
      // AppErrorの場合は詳細情報を含める
      if ('code' in error && 'details' in error) {
        return NextResponse.json(
          { 
            success: false,
            error: error.message,
            code: (error as any).code,
            details: (error as any).details
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '予期しないエラーが発生しました' },
      { status: 500 }
    );
  }
} 