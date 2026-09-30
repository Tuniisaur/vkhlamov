import { getR2PublicBase } from "./r2";

let dynamicMediaBase = "";

if (typeof window !== "undefined") {
  try {
    const cached = localStorage.getItem("valerio_studio_media_base");
    if (cached) {
      dynamicMediaBase = cached.trim().replace(/\/+$/, "");
    }
  } catch {}
}

export function setDynamicMediaBase(base?: string | null) {
  if (!base) return;
  const cleaned = base.trim().replace(/\/+$/, "");
  if (cleaned && !cleaned.includes("r2.cloudflarestorage.com")) {
    dynamicMediaBase = cleaned;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("valerio_studio_media_base", cleaned);
      } catch {}
    }
  }
}

export function getDynamicMediaBase(): string {
  return dynamicMediaBase;
}

/**
 * Resolves any media path (relative /images/..., /videos/..., or R2 key)
 * to a fully qualified, publicly accessible CDN URL or stream proxy URL.
 * Works both server-side (process.env.R2_PUBLIC_URL) and client-side
 * (NEXT_PUBLIC_R2_PUBLIC_URL or dynamic CDN base) automatically.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Already a full HTTP/HTTPS URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const nextPublicBase =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "")
      : "";

  const serverBase = typeof window === "undefined" ? getR2PublicBase() : "";

  const activeBase =
    (dynamicMediaBase && !dynamicMediaBase.includes("r2.cloudflarestorage.com")
      ? dynamicMediaBase
      : "") ||
    (nextPublicBase && !nextPublicBase.includes("r2.cloudflarestorage.com")
      ? nextPublicBase
      : "") ||
    (serverBase && !serverBase.includes("r2.cloudflarestorage.com")
      ? serverBase
      : "");

  // If already a streaming proxy URL, redirect directly to CDN if activeBase is available
  if (trimmed.startsWith("/api/media/stream/")) {
    if (activeBase) {
      const subKey = trimmed.replace(/^\/api\/media\/stream\//, "").replace(/^\/+/, "");
      return `${activeBase}/${subKey}`;
    }
    return trimmed;
  }

  // Clean relative path: strip leading slashes
  const cleanKey = trimmed.replace(/^\/+/, "");

  if (activeBase) {
    return `${activeBase}/${cleanKey}`;
  }

  // Fallback: If it's a relative path starting with images/ or videos/, return as root-relative path (/images/... or /videos/...)
  // This allows Next.js static asset serving from public/ and the specialized /images and /videos routes to work seamlessly
  if (cleanKey.startsWith("images/") || cleanKey.startsWith("videos/")) {
    return `/${cleanKey}`;
  }

  // Fallback to streaming proxy
  return `/api/media/stream/${cleanKey}`;
}
