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
  webpack(config) {
    // Compile the same Tailwind utilities before webpack processes the global stylesheet.
    config.module.rules.push({
      test: /[\\/]app[\\/]globals\.css$/,
      enforce: "pre",
      use: ["@tailwindcss/turbopack"],
    });
    return config;
  },
};

export default nextConfig;
