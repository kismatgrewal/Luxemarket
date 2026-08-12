/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The codebase is type-safe and lint-clean; failing loudly in CI beats
  // shipping a build that hides errors.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
