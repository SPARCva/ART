import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is served at sparcsolutions.org/accessibility via a Netlify proxy
  // from the main site. basePath makes every route and asset live under it.
  basePath: "/accessibility",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ldxpockcgcxvsrbyhcnt.supabase.co" },
    ],
  },
};

export default nextConfig;
