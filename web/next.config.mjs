/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/repos',
        destination: 'http://localhost:3000/api/repos',
      },
      {
        source: '/api/repos/:path*',
        destination: 'http://localhost:3000/api/repos/:path*',
      },
      {
        source: '/api/packets/:path*',
        destination: 'http://localhost:3000/api/packets/:path*',
      },
      {
        source: '/api/jobs/:path*',
        destination: 'http://localhost:3000/api/jobs/:path*',
      },
    ];
  },
};

export default nextConfig;
