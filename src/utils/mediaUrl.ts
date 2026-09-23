import { getR2PublicBase } from "./r2";

/**
 * Resolves any media path (relative /images/..., /videos/..., or R2 key)
 * to a fully qualified, publicly accessible CDN URL or stream proxy URL.
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

  // If R2_PUBLIC_URL is configured (e.g. Cloudflare r2.dev CDN)
  const publicBase = getR2PublicBase();
  if (publicBase) {
    return `${publicBase}/${cleanKey}`;
  }

  // Fallback to streaming proxy
  return `/api/media/stream/${cleanKey}`;
}
