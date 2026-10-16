import type { NextConfig } from "next";
import { execSync } from "child_process";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://alfychat.com").replace(/\/+$/, "");

/**
 * Pages déménagées sur le site (alfychat.com). Les anciens liens continuent
 * de fonctionner : on y renvoie en conservant le chemin.
 */
const SITE_PATHS = [
  "/about",
  "/faq",
  "/jobs",
  "/newsroom/:path*",
  "/privacy",
  "/rgpd",
  "/terms",
  "/support/:path*",
  "/legal/:path*",
  "/brand",
  "/changelogs",
  "/status/:path*",
  "/developers/docs/:path*",
  "/hosting",
];

const nextConfig: NextConfig = {
  output: "standalone",
  generateBuildId: async () => {
    try {
      return execSync("git rev-parse HEAD").toString().trim();
    } catch {
      return `build-${Date.now()}`;
    }
  },
  async redirects() {
    return SITE_PATHS.map((source) => ({
      source,
      destination: `${SITE_URL}${source}`,
      // 307 tant que les domaines sont en rodage : un 308 serait mis en cache
      // à vie par les navigateurs. Passer à `true` une fois .com stabilisé.
      permanent: false,
    }));
  },
};

export default nextConfig;
