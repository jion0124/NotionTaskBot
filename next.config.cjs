/** @type {import('next').NextConfig} */
const nextConfig = {
  // 画像最適化
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['cdn.discordapp.com'],
  },

  // 実験的機能
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-label', '@radix-ui/react-slot'],
  },

  // 圧縮設定
  compress: true,

  // パフォーマンス設定
  poweredByHeader: false,

  // 静的ファイル最適化
  generateEtags: false,

  // 開発環境での最適化
  swcMinify: true,

  // バンドル分析
  webpack: (config, {
    dev,
    isServer
  }) => {
    // 本番環境での最適化
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },
}

// バンドル分析の設定
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
  });
  module.exports = withBundleAnalyzer(nextConfig);
} else {
  module.exports = nextConfig;
}