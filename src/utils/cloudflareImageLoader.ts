import type { ImageLoaderProps } from "next/image";

/**
 * Cloudflare Image Loader for Next.js
 *
 * Offloads 100% of image transformations to Cloudflare Edge Image Resizing / CDN,
 * completely bypassing Vercel Image Optimization and preventing any quota consumption on Vercel.
 *
 * Cloudflare documentation:
 * https://developers.cloudflare.com/images/image-resizing/url-format/
 */
export default function cloudflareLoader({ src, width, quality }: ImageLoaderProps): string {
  if (!src) return "";

  // 1. In local development or during static build analysis, serve original src directly
  if (process.env.NODE_ENV === "development") {
    return src;
  }

  // 2. If the user explicitly disables edge resizing (serving original directly from Cloudflare R2/CDN)
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING === "false") {
    return src;
  }

  // 3. Prevent double-wrapping if already transformed
  if (src.includes("/cdn-cgi/image/")) {
    return src;
  }

  // 4. Build Cloudflare transformation parameters
  const params: string[] = [`width=${width}`];
  if (quality) {
    params.push(`quality=${quality}`);
  } else {
    params.push("quality=80");
  }
  params.push("format=auto"); // Automatically delivers WebP or AVIF based on browser Accept header
  params.push("fit=scale-down"); // Smooth proportional fit without distortion
  const paramsString = params.join(",");

  // 5. Optional custom Cloudflare zone URL prefix (e.g. https://vkhlamov.com or https://media.vkhlamov.com)
  const zoneUrl = (process.env.NEXT_PUBLIC_CLOUDFLARE_ZONE_URL || "").trim().replace(/\/+$/, "");

  // 6. Absolute URLs (e.g. Cloudflare R2 public URL https://pub-xxx.r2.dev/...)
  if (src.startsWith("http://") || src.startsWith("https://")) {
    if (zoneUrl) {
      return `${zoneUrl}/cdn-cgi/image/${paramsString}/${src}`;
    }
    return `/cdn-cgi/image/${paramsString}/${src}`;
  }

  // 7. Relative paths (e.g. /images/... or images/...)
  const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
  if (zoneUrl) {
    return `${zoneUrl}/cdn-cgi/image/${paramsString}/${cleanSrc}`;
  }

  return `/cdn-cgi/image/${paramsString}/${cleanSrc}`;
}
