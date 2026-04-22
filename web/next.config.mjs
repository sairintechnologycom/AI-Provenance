/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path(repos|governance|packets|jobs|admin|slack)/:path2*',
        destination: `${backendUrl}/api/:path/:path2*`,
      },
    ];
  },
};

export default nextConfig;
