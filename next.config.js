/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '192.168.2.38',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig