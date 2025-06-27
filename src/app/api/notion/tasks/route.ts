import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, databaseId } = await request.json();
    if (!apiKey || !databaseId) {
      return NextResponse.json({ 
        success: false, 
        error: 'APIキーとデータベースIDは必須です' 
      }, { status: 400 });
    }
    const notion = new Client({ auth: apiKey });
    const response = await notion.databases.query({ database_id: databaseId });
    return NextResponse.json({
      success: true,
      data: {
        tasks: response.results
      }
    });
  } catch (e: any) {
    return NextResponse.json({ 
      success: false, 
      error: e.message 
    }, { status: 500 });
  }
} 