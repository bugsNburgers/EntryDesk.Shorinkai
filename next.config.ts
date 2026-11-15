import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const appRoot = dirname(fileURLToPath(import.meta.url));

// The R2 photo host (custom domain in production, r2.dev in preview/dev) comes from
// R2_PUBLIC_BASE_URL so next/image can resize athlete/coach photos into small avatars.
// It is exposed to the client so SafeAvatar's allow-list matches remotePatterns.
function photoHost(): string {
  try {
    return process.env.R2_PUBLIC_BASE_URL ? new URL(process.env.R2_PUBLIC_BASE_URL).hostname : "";
  } catch {
    return "";
  }
}
const r2PhotoHost = photoHost();

const nextConfig: NextConfig = {
  // E2E runs its own dev server with a separate build dir so it never fights a normal
  // `next dev` over the .next lock (see playwright.config.ts).
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  turbopack: {
    root: appRoot,
  },
  env: {
    NEXT_PUBLIC_R2_PHOTO_HOST: r2PhotoHost,
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
      ...(r2PhotoHost ? [{ protocol: "https" as const, hostname: r2PhotoHost }] : []),
    ],
  },
  // Parent portal lives in src/app/athlete (URL = folder). Legacy /parent/* and
  // /athlete/children/* bookmarks are redirected in src/proxy.ts.
};

export default nextConfig;
