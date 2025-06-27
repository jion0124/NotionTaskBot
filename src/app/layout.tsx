import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { setupGlobalErrorHandler } from '@/lib/error-handler';

// フォント最適化
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const metadata: Metadata = {
  title: "NotionTaskBot Dashboard",
  description: "DiscordとNotionを連携したタスク管理ボットの管理画面",
  keywords: ["Discord", "Notion", "タスク管理", "ボット", "SaaS"],
  authors: [{ name: "NotionTaskBot Team" }],
  creator: "NotionTaskBot",
  publisher: "NotionTaskBot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "NotionTaskBot Dashboard",
    description: "DiscordとNotionを連携したタスク管理ボットの管理画面",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "NotionTaskBot Dashboard",
    description: "DiscordとNotionを連携したタスク管理ボットの管理画面",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

// グローバルエラーハンドラーを設定
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" className={inter.className}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//discord.com" />
        <link rel="dns-prefetch" href="//supabase.co" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 