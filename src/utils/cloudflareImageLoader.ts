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

  // 2. Zone URL is required for Cloudflare Image Resizing to work on external hosts like *.vercel.app.
  // Without a proxied Cloudflare custom domain, requests to /cdn-cgi/image/ return 404 from Vercel.
  const zoneUrl = (process.env.NEXT_PUBLIC_CLOUDFLARE_ZONE_URL || "").trim().replace(/\/+$/, "");
  if (!zoneUrl) {
    return src;
  }

  // 3. If the user explicitly disables edge resizing
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING === "false") {
    return src;
  }

  // 4. Prevent double-wrapping if already transformed
  if (src.includes("/cdn-cgi/image/")) {
    return src;
  }

  // 5. Build Cloudflare transformation parameters
  const params: string[] = [`width=${width}`];
  if (quality) {
    params.push(`quality=${quality}`);
  } else {
    params.push("quality=80");
  }
  params.push("format=auto");
  params.push("fit=scale-down");
  const paramsString = params.join(",");

  // 6. Absolute URLs
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return `${zoneUrl}/cdn-cgi/image/${paramsString}/${src}`;
  }

  // 7. Relative paths
  const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
  return `${zoneUrl}/cdn-cgi/image/${paramsString}/${cleanSrc}`;
}
