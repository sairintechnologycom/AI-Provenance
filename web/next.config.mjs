/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/repos',
        destination: `${backendUrl}/api/repos`,
      },
      {
        source: '/api/repos/:path*',
        destination: `${backendUrl}/api/repos/:path*`,
      },
      {
        source: '/api/packets/:path*',
        destination: `${backendUrl}/api/packets/:path*`,
      },
      {
        source: '/api/jobs/:path*',
        destination: `${backendUrl}/api/jobs/:path*`,
      },
    ];
  },
};

export default nextConfig;
