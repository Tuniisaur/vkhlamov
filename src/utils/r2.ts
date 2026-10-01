import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  ListObjectsV2CommandOutput,
  PutBucketCorsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from "path";
import crypto from "crypto";

function cleanEnv(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getCloudflareApiToken(): string {
  return cleanEnv(
    process.env.CLOUDFLARE_API_TOKEN ||
    process.env.CF_API_TOKEN ||
    process.env.R2_API_TOKEN ||
    process.env.CLOUDFLARE_TOKEN
  );
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
  publicUrlConfigured: boolean;
  publicBase: string;
} {
  const missing: string[] = [];
  if (!getR2AccountId()) missing.push("R2_ACCOUNT_ID");
  if (!cleanEnv(process.env.R2_ACCESS_KEY_ID)) missing.push("R2_ACCESS_KEY_ID");
  if (!cleanEnv(process.env.R2_SECRET_ACCESS_KEY)) missing.push("R2_SECRET_ACCESS_KEY");
  if (!getR2BucketName()) missing.push("R2_BUCKET_NAME");
  const publicBase = getR2PublicBase();
  return {
    configured: missing.length === 0,
    missing,
    publicUrlConfigured: Boolean(publicBase),
    publicBase,
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
  let base = cleanEnv(process.env.R2_PUBLIC_URL);
  if (!base) return "";
  // If the user pasted the private S3 API endpoint instead of a public CDN domain, fallback to streaming proxy
  if (base.includes("r2.cloudflarestorage.com")) {
    return "";
  }
  if (!base.startsWith("http://") && !base.startsWith("https://")) {
    base = `https://${base}`;
  }
  return base.replace(/\/+$/, "");
}

export function getR2ItemUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, "");
  const publicBase = getR2PublicBase();
  if (publicBase) {
    return `${publicBase}/${cleanKey}`;
  }
  // Automatic streaming proxy fallback if R2_PUBLIC_URL is not configured
  return `/api/media/stream/${cleanKey}`;
}

let corsConfigured = false;
export async function ensureR2Cors(): Promise<void> {
  if (corsConfigured || !isR2Configured()) return;
  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    corsConfigured = true;
  } catch (err) {
    // If the API token does not have admin permissions to configure CORS, log silently
    console.warn("Could not set R2 CORS configuration automatically:", err);
  }
}

export async function uploadBufferToR2(params: {
  key: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<string> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buffer,
      ContentType: params.contentType || "application/octet-stream",
    })
  );
  return getR2ItemUrl(params.key);
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
  // Best-effort ensure CORS is enabled on the bucket so direct browser uploads don't get blocked
  ensureR2Cors().catch(() => {});

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

  // NOTE: We deliberately do NOT restrict ContentType in PutObjectCommand here.
  // This allows the browser to send any matching or fallback Content-Type header without
  // encountering AWS SignatureDoesNotMatch / header signature mismatch errors.
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueKey,
  });

  // URL valid for 60 minutes
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
  const publicUrl = getR2ItemUrl(uniqueKey);

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
  const bucket = getR2BucketName();

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
    const itemUrl = getR2ItemUrl(key);

    const isVideo = [".mp4", ".mov", ".webm", ".avi", ".mkv"].includes(ext) || key.startsWith("videos/");
    const isImage = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"].includes(ext) || key.startsWith("images/");

    // Skip database JSON files, dotfiles, or non-media artifacts
    if (!isVideo && !isImage) continue;

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
  const bucket = getR2BucketName();

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

export interface R2StorageInfo {
  configured: boolean;
  bucketName: string;
  accountId: string;
  totalBytes: number;
  totalFormatted: string;
  objectCount: number;
  videosBytes: number;
  videosFormatted: string;
  videosCount: number;
  imagesBytes: number;
  imagesFormatted: string;
  imagesCount: number;
  otherBytes: number;
  otherCount: number;
  freeTierLimitBytes: number; // 10 GB = 10,737,418,240 bytes
  freeTierFormatted: string;
  freeTierPercentUsed: number;
  freeTierRemainingBytes: number;
  freeTierRemainingFormatted: string;
  source: "cloudflare-graphql" | "r2-s3-scan" | "local";
  graphQlAvailable: boolean;
  graphQlMetrics?: {
    payloadSize: number;
    metadataSize: number;
    objectCount: number;
    uploadCount: number;
    lastDatetime?: string;
  } | null;
  lastUpdated: string;
}

export async function fetchCloudflareGraphQLStorage(
  accountId: string,
  bucketName: string,
  apiToken: string
): Promise<{
  payloadSize: number;
  metadataSize: number;
  objectCount: number;
  uploadCount: number;
  lastDatetime?: string;
} | null> {
  if (!accountId || !bucketName || !apiToken) return null;

  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const query = `
      query GetBucketStorage($accountTag: string!, $startDate: Time!, $bucketName: string!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            r2StorageAdaptiveGroups(
              limit: 5,
              filter: {
                bucketName: $bucketName,
                datetime_geq: $startDate
              },
              orderBy: [datetime_DESC]
            ) {
              max {
                payloadSize
                metadataSize
                objectCount
                uploadCount
              }
              dimensions {
                datetime
              }
            }
          }
        }
      }
    `;

    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          accountTag: accountId,
          bucketName,
          startDate,
        },
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const group = json?.data?.viewer?.accounts?.[0]?.r2StorageAdaptiveGroups?.[0];

    if (group?.max && typeof group.max.payloadSize === "number") {
      return {
        payloadSize: group.max.payloadSize || 0,
        metadataSize: group.max.metadataSize || 0,
        objectCount: group.max.objectCount || 0,
        uploadCount: group.max.uploadCount || 0,
        lastDatetime: group.dimensions?.datetime,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getR2StorageUsage(localFallback?: {
  videosBytes?: number;
  videosCount?: number;
  imagesBytes?: number;
  imagesCount?: number;
}): Promise<R2StorageInfo> {
  const FREE_TIER_LIMIT = 10 * 1024 * 1024 * 1024; // 10 GB
  const lastUpdated = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // 1. If R2 is not configured, compute local storage as fallback
  if (!isR2Configured()) {
    const videosBytes = localFallback?.videosBytes || 0;
    const videosCount = localFallback?.videosCount || 0;
    const imagesBytes = localFallback?.imagesBytes || 0;
    const imagesCount = localFallback?.imagesCount || 0;

    const totalBytes = videosBytes + imagesBytes;
    const objectCount = videosCount + imagesCount;
    const freeTierPercentUsed = Number(((totalBytes / FREE_TIER_LIMIT) * 100).toFixed(2));
    const freeTierRemainingBytes = Math.max(0, FREE_TIER_LIMIT - totalBytes);

    return {
      configured: false,
      bucketName: "locale (public/)",
      accountId: "",
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      objectCount,
      videosBytes,
      videosFormatted: formatBytes(videosBytes),
      videosCount,
      imagesBytes,
      imagesFormatted: formatBytes(imagesBytes),
      imagesCount,
      otherBytes: 0,
      otherCount: 0,
      freeTierLimitBytes: FREE_TIER_LIMIT,
      freeTierFormatted: "10.00 GB",
      freeTierPercentUsed,
      freeTierRemainingBytes,
      freeTierRemainingFormatted: formatBytes(freeTierRemainingBytes),
      source: "local",
      graphQlAvailable: false,
      graphQlMetrics: null,
      lastUpdated,
    };
  }

  // 2. R2 is configured: scan bucket objects for exact real-time size & breakdown
  const accountId = getR2AccountId();
  const bucketName = getR2BucketName();
  const apiToken = getCloudflareApiToken();

  let graphQlMetrics: {
    payloadSize: number;
    metadataSize: number;
    objectCount: number;
    uploadCount: number;
    lastDatetime?: string;
  } | null = null;

  // Try GraphQL Analytics API if API token is present
  if (apiToken) {
    try {
      graphQlMetrics = await fetchCloudflareGraphQLStorage(accountId, bucketName, apiToken);
    } catch {}
  }

  const s3 = getR2Client();
  let videosBytes = 0;
  let videosCount = 0;
  let imagesBytes = 0;
  let imagesCount = 0;
  let otherBytes = 0;
  let otherCount = 0;

  try {
    let isTruncated = true;
    let continuationToken: string | undefined = undefined;

    while (isTruncated) {
      const listCmd = new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      });

      const res: ListObjectsV2CommandOutput = await s3.send(listCmd);
      const contents = res.Contents || [];

      for (const item of contents) {
        if (!item.Key) continue;
        const key = item.Key;
        const size = item.Size || 0;
        const ext = path.extname(key).toLowerCase();

        const isVideo =
          [".mp4", ".mov", ".webm", ".avi", ".mkv"].includes(ext) || key.startsWith("videos/");
        const isImage =
          [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"].includes(ext) ||
          key.startsWith("images/");

        if (isVideo) {
          videosBytes += size;
          videosCount++;
        } else if (isImage) {
          imagesBytes += size;
          imagesCount++;
        } else {
          otherBytes += size;
          otherCount++;
        }
      }

      isTruncated = Boolean(res.IsTruncated);
      continuationToken = res.NextContinuationToken;
    }
  } catch (err) {
    console.error("Error scanning R2 bucket objects:", err);
  }

  let totalBytes = videosBytes + imagesBytes + otherBytes;
  let objectCount = videosCount + imagesCount + otherCount;

  // If GraphQL has a higher or aggregated size, we can align or keep the exact object scan
  if (graphQlMetrics && graphQlMetrics.payloadSize > totalBytes) {
    totalBytes = graphQlMetrics.payloadSize;
    if (graphQlMetrics.objectCount > objectCount) {
      objectCount = graphQlMetrics.objectCount;
    }
  }

  const freeTierPercentUsed = Number(((totalBytes / FREE_TIER_LIMIT) * 100).toFixed(2));
  const freeTierRemainingBytes = Math.max(0, FREE_TIER_LIMIT - totalBytes);

  return {
    configured: true,
    bucketName,
    accountId,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    objectCount,
    videosBytes,
    videosFormatted: formatBytes(videosBytes),
    videosCount,
    imagesBytes,
    imagesFormatted: formatBytes(imagesBytes),
    imagesCount,
    otherBytes,
    otherCount,
    freeTierLimitBytes: FREE_TIER_LIMIT,
    freeTierFormatted: "10.00 GB",
    freeTierPercentUsed,
    freeTierRemainingBytes,
    freeTierRemainingFormatted: formatBytes(freeTierRemainingBytes),
    source: graphQlMetrics ? "cloudflare-graphql" : "r2-s3-scan",
    graphQlAvailable: Boolean(graphQlMetrics),
    graphQlMetrics,
    lastUpdated,
  };
}
