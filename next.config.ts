import type { NextConfig } from "next";
import { execSync } from "child_process";

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: async () => {
    try {
      return execSync("git rev-parse HEAD").toString().trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },
};

export default nextConfig;
