'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setError(error);
        return;
      }

      if (!code) {
        setStatus('error');
        setError('認証コードがありません');
        return;
      }

      try {
        // API Routeにリダイレクト
        const apiUrl = new URL('/api/auth/callback', window.location.origin);
        apiUrl.searchParams.set('code', code);
        if (state) {
          apiUrl.searchParams.set('state', state);
        }
        
        window.location.href = apiUrl.toString();
      } catch (err) {
        setStatus('error');
        setError('認証処理中にエラーが発生しました');
      }
    };

    processCallback();
  }, [searchParams]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">認証エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              ログインページに戻る
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>認証処理中...</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Discord認証を処理しています</p>
        </CardContent>
      </Card>
    </div>
  );
} 