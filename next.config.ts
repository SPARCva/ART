import type { NextConfig } from "next";

const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(isStatic ? { output: "export" as const } : {}),
  // The app lives at sparcsolutions.org/ART (Accessibility in Real Time),
  // proxied by a Cloudflare Worker. basePath puts every route/asset under it.
  basePath: "/ART",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ldxpockcgcxvsrbyhcnt.supabase.co" },
    ],
  },
};

export default nextConfig;
