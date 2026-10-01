import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isRequestAuthenticated } from "@/utils/serverAuth";
import {
  isR2Configured,
  listR2Objects,
  deleteR2Object,
  getR2PublicBase,
  uploadBufferToR2,
  getR2StorageUsage,
} from "@/utils/r2";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const VIDEOS_DIR = path.join(PUBLIC_DIR, "videos");
const IMAGES_DIR = path.join(PUBLIC_DIR, "images");

// Strict Whitelist
const ALLOWED_VIDEO_EXTS = new Set([".mp4", ".webm", ".mov"]);
const ALLOWED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_SIZE = 30 * 1024 * 1024;  // 30 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// ── GET: Return list of all video and image media (Protected) ──
export async function GET(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const videos: { name: string; path: string; size: string; key?: string }[] = [];
    const images: { name: string; path: string; size: string; key?: string }[] = [];

    // 1. Fetch from Cloudflare R2 if configured
    if (isR2Configured()) {
      try {
        const r2Media = await listR2Objects();
        videos.push(...r2Media.videos);
        images.push(...r2Media.images);
      } catch (r2Err) {
        console.error("Cloudflare R2 listing error:", r2Err);
      }
    }

    // 2. Also read local media as fallback/supplement
    try {
      const vFiles = await fs.readdir(VIDEOS_DIR);
      for (const file of vFiles) {
        if (file.startsWith(".")) continue;
        const ext = path.extname(file).toLowerCase();
        if (!ALLOWED_VIDEO_EXTS.has(ext)) continue;

        const filePath = path.join(VIDEOS_DIR, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const localPath = `/videos/${encodeURIComponent(file)}`;
          if (!videos.some((v) => v.path === localPath)) {
            videos.push({
              name: file,
              path: localPath,
              size: formatBytes(stat.size),
            });
          }
        }
      }
    } catch (err) {
      console.warn("Could not read local videos dir:", err);
    }

    try {
      const iFiles = await fs.readdir(IMAGES_DIR);
      for (const file of iFiles) {
        if (file.startsWith(".")) continue;
        const ext = path.extname(file).toLowerCase();
        if (!ALLOWED_IMAGE_EXTS.has(ext)) continue;

        const filePath = path.join(IMAGES_DIR, file);
        const stat = await fs.stat(filePath);
        if (stat.isFile()) {
          const localPath = `/images/${encodeURIComponent(file)}`;
          if (!images.some((img) => img.path === localPath)) {
            images.push({
              name: file,
              path: localPath,
              size: formatBytes(stat.size),
            });
          }
        }
      }
    } catch (err) {
      console.warn("Could not read local images dir:", err);
    }

    let storage = null;
    try {
      storage = await getR2StorageUsage();
    } catch (sErr) {
      console.warn("Could not retrieve storage metrics:", sErr);
    }

    return NextResponse.json({ videos, images, storage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listing media";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST: Upload new video or image media (Protected) ──
export async function POST(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const forcedType = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nessun file fornito" }, { status: 400 });
    }

    const originalName = file.name || "upload";
    const ext = path.extname(originalName).toLowerCase();

    // 1. Extension validation
    const isVideo =
      forcedType === "video" ||
      ALLOWED_VIDEO_EXTS.has(ext) ||
      file.type.startsWith("video/");

    if (isVideo && !ALLOWED_VIDEO_EXTS.has(ext)) {
      return NextResponse.json(
        { error: `Formato video non consentito. Estensioni ammesse: ${Array.from(ALLOWED_VIDEO_EXTS).join(", ")}` },
        { status: 400 }
      );
    }

    if (!isVideo && !ALLOWED_IMAGE_EXTS.has(ext)) {
      return NextResponse.json(
        { error: `Formato immagine non consentito. Estensioni ammesse: ${Array.from(ALLOWED_IMAGE_EXTS).join(", ")}` },
        { status: 400 }
      );
    }

    // 2. MIME type validation
    if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Tipo MIME '${file.type}' non consentito` },
        { status: 400 }
      );
    }

    // 3. File size limits
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Dimensione file eccessiva. Massimo consentito: ${formatBytes(maxSize)}` },
        { status: 400 }
      );
    }

    // 4. Sanitize base filename and prevent path traversal
    const cleanBaseName = path
      .basename(originalName, ext)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

    const safeFilename = `${cleanBaseName || "media"}-${crypto.randomBytes(4).toString("hex")}${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If Cloudflare R2 is configured, upload directly to the R2 bucket (works on Vercel)
    if (isR2Configured()) {
      const folder = isVideo ? "videos" : "images";
      const key = `${folder}/${safeFilename}`;
      const itemUrl = await uploadBufferToR2({
        key,
        buffer,
        contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"),
      });

      return NextResponse.json({
        success: true,
        name: safeFilename,
        path: itemUrl,
        key,
        size: formatBytes(buffer.length),
        type: isVideo ? "video" : "image",
      });
    }

    // Local disk fallback (only used in local offline environment)
    const targetDir = isVideo ? VIDEOS_DIR : IMAGES_DIR;
    const targetPath = path.resolve(targetDir, safeFilename);

    // Verify canonical path does not escape targetDir
    if (!targetPath.startsWith(path.resolve(targetDir))) {
      return NextResponse.json({ error: "Nome file o percorso non valido" }, { status: 400 });
    }

    // Write file to disk
    await fs.writeFile(targetPath, buffer);

    const relativePath = isVideo
      ? `/videos/${encodeURIComponent(safeFilename)}`
      : `/images/${encodeURIComponent(safeFilename)}`;

    return NextResponse.json({
      success: true,
      name: safeFilename,
      path: relativePath,
      size: formatBytes(buffer.length),
      type: isVideo ? "video" : "image",
    });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── DELETE: Delete media file from disk or Cloudflare R2 (Protected) ──
export async function DELETE(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { path?: string; key?: string };
    const reqPath = body.path;
    const reqKey = body.key;

    if (!reqPath && !reqKey) {
      return NextResponse.json({ error: "Percorso o chiave non valido" }, { status: 400 });
    }

    // 1. If Cloudflare R2 is configured, check if this is an R2 file
    if (isR2Configured()) {
      let r2Key = reqKey;
      if (!r2Key && reqPath) {
        if (reqPath.startsWith("/api/media/stream/")) {
          r2Key = reqPath.replace(/^\/api\/media\/stream\//, "");
        } else {
          const publicBase = getR2PublicBase();
          if (publicBase && reqPath.startsWith(publicBase)) {
            r2Key = reqPath.slice(publicBase.length).replace(/^\/+/, "");
          } else if (reqPath.startsWith("http://") || reqPath.startsWith("https://")) {
            try {
              const urlObj = new URL(reqPath);
              r2Key = urlObj.pathname.replace(/^\/+/, "");
            } catch {}
          }
        }
      }

      if (r2Key) {
        await deleteR2Object(r2Key);
        return NextResponse.json({
          success: true,
          message: "File eliminato con successo da Cloudflare R2",
          deletedPath: reqPath || r2Key,
        });
      }
    }

    // 2. Local disk file deletion fallback
    if (!reqPath || typeof reqPath !== "string") {
      return NextResponse.json({ error: "Percorso non valido" }, { status: 400 });
    }

    const decoded = decodeURIComponent(reqPath).trim();

    // Check directory prefix
    if (!decoded.startsWith("/videos/") && !decoded.startsWith("/images/")) {
      return NextResponse.json({ error: "Accesso non autorizzato al file" }, { status: 403 });
    }

    // Resolve canonical absolute path
    const resolvedPath = path.resolve(PUBLIC_DIR, decoded.replace(/^\//, ""));

    // Ensure path is strictly inside VIDEOS_DIR or IMAGES_DIR
    const resolvedVideos = path.resolve(VIDEOS_DIR);
    const resolvedImages = path.resolve(IMAGES_DIR);

    const isInsideVideos = resolvedPath.startsWith(resolvedVideos + path.sep);
    const isInsideImages = resolvedPath.startsWith(resolvedImages + path.sep);

    if (!isInsideVideos && !isInsideImages) {
      return NextResponse.json({ error: "Tentativo di path traversal rilevato" }, { status: 403 });
    }

    // Unlink file if it exists on disk
    try {
      const stat = await fs.stat(resolvedPath);
      if (stat.isFile()) {
        await fs.unlink(resolvedPath);
      }
    } catch {
      // If the file is already gone or was not synced to Vercel disk, treat as deleted
    }

    return NextResponse.json({
      success: true,
      message: "File eliminato con successo",
      deletedPath: reqPath,
    });
  } catch (err: unknown) {
    console.error("Delete error:", err);
    const msg = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
