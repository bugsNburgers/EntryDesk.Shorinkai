import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const appRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/parent/children/new',
        destination: '/athlete/new',
        permanent: false,
      },
      {
        source: '/parent/children/:id/register',
        destination: '/athlete/:id/register',
        permanent: false,
      },
      {
        source: '/parent/children/:id',
        destination: '/athlete/:id',
        permanent: false,
      },
      {
        source: '/parent/entries/:path*',
        destination: '/athlete/entries/:path*',
        permanent: false,
      },
      {
        source: '/parent',
        destination: '/athlete',
        permanent: false,
      },
      {
        source: '/parent/:path*',
        destination: '/athlete/:path*',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/athlete',
        destination: '/parent',
      },
      {
        source: '/athlete/new',
        destination: '/parent/children/new',
      },
      {
        source: '/athlete/:id/register',
        destination: '/parent/children/:id/register',
      },
      {
        source: '/athlete/entries/:path*',
        destination: '/parent/entries/:path*',
      },
      {
        source: '/athlete/:id',
        destination: '/parent/children/:id',
      },
    ]
  },
};

export default nextConfig;
