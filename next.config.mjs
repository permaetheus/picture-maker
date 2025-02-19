/*
<ai_context>
Configures Next.js for the app.
</ai_context>
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "localhost" }]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
}

export default nextConfig
