import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/import',
        destination: '/receiving-stock',
        permanent: false,
      },
      {
        source: '/import/scan',
        destination: '/receiving-stock',
        permanent: false,
      },
      {
        source: '/import-history',
        destination: '/receiving-stock/history',
        permanent: false,
      },
    ]
  },
}

export default nextConfig
