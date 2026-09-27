/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/support',
        destination: '/app-support',
        permanent: false,
      },
      {
        source: '/support/new',
        destination: '/app-support/new',
        permanent: false,
      },
      {
        source: '/support/:id',
        destination: '/app-support/:id',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
