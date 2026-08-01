import { resolveMediaUrl } from "./api";

const DEFAULT_AVATAR_IMAGES = [
  "/users/default.png",
  "/users/default2.png",
  "/users/default3.png",
];

const DEFAULT_AVATAR_COLORS = [
  "#4f46e5",
  "#0284c7",
  "#0f766e",
  "#be123c",
  "#7c3aed",
  "#c2410c",
  "#0ea5e9",
  "#16a34a",
  "#db2777",
];

function stableHash(value?: string): number {
  if (!value) return 0;
  let hash = 0;
  for (const char of value) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

export function getDefaultAvatarUrl(seed?: string): string {
  const index = stableHash(seed) % DEFAULT_AVATAR_IMAGES.length;
  return DEFAULT_AVATAR_IMAGES[index];
}

export function getAvatarImageSrc(avatarUrl?: string | null, seed?: string): string {
  return resolveMediaUrl(avatarUrl) || getDefaultAvatarUrl(seed);
}

export function getAvatarFallbackBg(seed?: string): string {
  const index = stableHash(seed) % DEFAULT_AVATAR_COLORS.length;
  return DEFAULT_AVATAR_COLORS[index];
}
