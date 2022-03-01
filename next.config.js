/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  redirects: () => [
    { 
      source: "/visualizers/boxes",
      destination: "/",
      permanent: true,
    }
  ],
  swcMinify: false,
  compiler: {
    // ssr and displayName are configured by default
    styledComponents: true,
  },
}

module.exports = nextConfig
