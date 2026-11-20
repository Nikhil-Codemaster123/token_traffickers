import type { NextConfig } from "next";

// Cache Components is switched off on purpose: every screen in this demo shows
// live data (cases, events, slots), so classic request-time rendering is simpler.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
