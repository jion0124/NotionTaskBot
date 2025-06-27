import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="text-6xl mb-4">404</div>
          <CardTitle>ページが見つかりません</CardTitle>
          <CardDescription>
            お探しのページは存在しないか、移動された可能性があります
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            正しいURLをご確認いただくか、以下のリンクから移動してください
          </p>
          <div className="flex gap-2">
            <Link href="/" prefetch={false}>
              <Button className="flex-1 transition-optimized">
                ホームに戻る
              </Button>
            </Link>
            <Link href="/auth/login" prefetch={false}>
              <Button variant="outline" className="flex-1 transition-optimized">
                ログイン
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 