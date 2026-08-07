/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@node-rs/argon2", "bullmq", "ioredis"],
  eslint: {
    // Lint is run explicitly in CI via `pnpm lint`; do not fail production builds on it.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Server Actions body size limit for bulk CSV uploads.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
