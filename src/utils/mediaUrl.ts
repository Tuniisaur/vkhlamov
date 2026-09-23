import { getR2PublicBase } from "./r2";

/**
 * Resolves any media path (relative /images/..., /videos/..., or R2 key)
 * to a fully qualified, publicly accessible CDN URL or stream proxy URL.
 * Works both server-side (process.env.R2_PUBLIC_URL) and client-side
 * (NEXT_PUBLIC_R2_PUBLIC_URL) automatically.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Already a full HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Already a streaming proxy URL
  if (trimmed.startsWith("/api/media/stream/")) {
    return trimmed;
  }

  // Clean relative path: strip leading slashes
  const cleanKey = trimmed.replace(/^\/+/, "");

  // Client-side: use NEXT_PUBLIC_R2_PUBLIC_URL if available
  const nextPublicBase =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "")
      : "";
  if (nextPublicBase && !nextPublicBase.includes("r2.cloudflarestorage.com")) {
    return `${nextPublicBase}/${cleanKey}`;
  }

  // Server-side: use R2_PUBLIC_URL via getR2PublicBase()
  const publicBase = getR2PublicBase();
  if (publicBase) {
    return `${publicBase}/${cleanKey}`;
  }

  // Fallback to streaming proxy
  return `/api/media/stream/${cleanKey}`;
}
