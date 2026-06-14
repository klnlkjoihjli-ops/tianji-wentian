/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      // 根路径直接服务 shenshu.html，去掉 iframe 套壳（消除黑屏/滚动条不确定性）
      beforeFiles: [
        { source: '/', destination: '/shenshu.html' },
      ],
    }
  },
  async headers() {
    return [
      {
        source: '/shenshu.html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
