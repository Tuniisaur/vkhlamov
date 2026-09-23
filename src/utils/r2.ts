import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

export function getR2AccountId(): string {
  let id = cleanEnv(process.env.R2_ACCOUNT_ID);
  if (id.includes("r2.cloudflarestorage.com")) {
    id = id.replace(/https?:\/\//, "").replace(/\.r2\.cloudflarestorage\.com.*$/, "");
  }
  return id;
}

export function getR2BucketName(): string {
  return cleanEnv(process.env.R2_BUCKET_NAME);
}

export function getR2Status(): {
  configured: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  if (!getR2AccountId()) missing.push("R2_ACCOUNT_ID");
  if (!cleanEnv(process.env.R2_ACCESS_KEY_ID)) missing.push("R2_ACCESS_KEY_ID");
  if (!cleanEnv(process.env.R2_SECRET_ACCESS_KEY)) missing.push("R2_SECRET_ACCESS_KEY");
  if (!getR2BucketName()) missing.push("R2_BUCKET_NAME");
  return {
    configured: missing.length === 0,
    missing,
  };
}

export function isR2Configured(): boolean {
  return getR2Status().configured;
}

export function getR2Client(): S3Client {
  const accountId = getR2AccountId();
  const accessKeyId = cleanEnv(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = cleanEnv(process.env.R2_SECRET_ACCESS_KEY);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Credenziali Cloudflare R2 non configurate");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function getR2PublicBase(): string {
  const base = cleanEnv(process.env.R2_PUBLIC_URL);
  return base.replace(/\/+$/, "");
}

export async function createR2PresignedUpload(params: {
  filename: string;
  contentType: string;
  folder?: "videos" | "images";
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
}> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();

  const ext = path.extname(params.filename).toLowerCase();
  const baseName = path
    .basename(params.filename, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);

  const folder = params.folder || (params.contentType.startsWith("video/") ? "videos" : "images");
  const uniqueKey = `${folder}/${baseName || "media"}-${crypto.randomBytes(4).toString("hex")}${ext}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueKey,
    ContentType: params.contentType,
  });

  // URL valid for 60 minutes
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicBase = getR2PublicBase();
  const publicUrl = publicBase ? `${publicBase}/${uniqueKey}` : uniqueKey;

  return {
    uploadUrl,
    publicUrl,
    key: uniqueKey,
  };
}

export async function listR2Objects(): Promise<{
  videos: { name: string; path: string; size: string; key: string }[];
  images: { name: string; path: string; size: string; key: string }[];
}> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;
  const publicBase = getR2PublicBase();

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    MaxKeys: 1000,
  });

  const response = await s3.send(command);
  const contents = response.Contents || [];

  const videos: { name: string; path: string; size: string; key: string }[] = [];
  const images: { name: string; path: string; size: string; key: string }[] = [];

  function formatBytes(bytes?: number): string {
    if (!bytes) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  for (const item of contents) {
    if (!item.Key) continue;
    const key = item.Key;
    const name = key.split("/").pop() || key;
    const ext = path.extname(key).toLowerCase();
    const itemUrl = publicBase ? `${publicBase}/${key}` : `/${key}`;

    const isVideo = [".mp4", ".mov", ".webm", ".avi", ".mkv"].includes(ext) || key.startsWith("videos/");
    const entry = {
      name,
      path: itemUrl,
      size: formatBytes(item.Size),
      key,
    };

    if (isVideo) {
      videos.push(entry);
    } else {
      images.push(entry);
    }
  }

  return { videos, images };
}

export async function deleteR2Object(key: string): Promise<void> {
  const s3 = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME!;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await s3.send(command);
}

export async function getR2Content<T>(key: string): Promise<T | null> {
  if (!isR2Configured()) return null;
  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const res = await s3.send(command);
    if (!res.Body) return null;
    const str = await res.Body.transformToString();
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

export async function putR2Content(key: string, data: unknown): Promise<void> {
  if (!isR2Configured()) {
    throw new Error("Cloudflare R2 non configurato");
  }
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  });
  await s3.send(command);
}
