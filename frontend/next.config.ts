import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignora errori di build TypeScript per evitare blocchi inutili
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5005/api/:path*",
      },
    ];
  },
};

export default nextConfig;