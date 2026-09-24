import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getR2Client, getR2BucketName, isR2Configured, getR2PublicBase } from "@/utils/r2";
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

export async function HEAD(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  if (!key || key.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const fullKey = key.join("/");
  if (!isR2Configured() || !fullKey) {
    return new NextResponse(null, { status: 404 });
  }

  const publicBase = getR2PublicBase();
  if (publicBase && !publicBase.includes("r2.cloudflarestorage.com")) {
    return NextResponse.redirect(`${publicBase}/${fullKey}`, 307);
  }

  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: fullKey,
    });
    const response = await s3.send(command);

    let contentType = response.ContentType;
    if (!contentType || contentType === "application/octet-stream") {
      const lower = fullKey.toLowerCase();
      if (lower.endsWith(".mp4")) contentType = "video/mp4";
      else if (lower.endsWith(".mov")) contentType = "video/quicktime";
      else if (lower.endsWith(".webm")) contentType = "video/webm";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (lower.endsWith(".png")) contentType = "image/png";
      else if (lower.endsWith(".webp")) contentType = "image/webp";
      else contentType = "application/octet-stream";
    }

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    };
    if (response.ContentLength !== undefined) {
      headers["Content-Length"] = response.ContentLength.toString();
    }

    return new Response(null, {
      status: 200,
      headers,
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  if (!key || key.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fullKey = key.join("/");

  if (!isR2Configured() || !fullKey) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Direct 307 redirect to Cloudflare global CDN edge (ultra-fast, zero serverless proxy bottleneck)
  const publicBase = getR2PublicBase();
  if (publicBase && !publicBase.includes("r2.cloudflarestorage.com")) {
    return NextResponse.redirect(`${publicBase}/${fullKey}`, 307);
  }

  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();

    // Check Range request header (essential for video timeline scrubbing)
    const rangeHeader = req.headers.get("range");

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const response = await s3.send(command);
    if (!response.Body) {
      return new NextResponse("Not Found", { status: 404 });
    }

    let contentType = response.ContentType;
    if (!contentType || contentType === "application/octet-stream") {
      const lower = fullKey.toLowerCase();
      if (lower.endsWith(".mp4")) contentType = "video/mp4";
      else if (lower.endsWith(".mov")) contentType = "video/quicktime";
      else if (lower.endsWith(".webm")) contentType = "video/webm";
      else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (lower.endsWith(".png")) contentType = "image/png";
      else if (lower.endsWith(".webp")) contentType = "image/webp";
      else if (lower.endsWith(".avif")) contentType = "image/avif";
      else contentType = "application/octet-stream";
    }

    const isPartial = Boolean(response.ContentRange);

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    };

    if (response.ContentLength !== undefined) {
      headers["Content-Length"] = response.ContentLength.toString();
    }
    if (response.ContentRange) {
      headers["Content-Range"] = response.ContentRange;
    }

    // Convert response.Body across Node.js runtime and Web Stream environments
    let bodyData: BodyInit;
    if (typeof (response.Body as any)?.transformToWebStream === "function") {
      bodyData = (response.Body as any).transformToWebStream();
    } else if (response.Body instanceof Readable) {
      bodyData = Readable.toWeb(response.Body) as ReadableStream;
    } else if (typeof (response.Body as any)?.transformToByteArray === "function") {
      const bytes = await (response.Body as any).transformToByteArray();
      bodyData = bytes;
    } else {
      bodyData = response.Body as unknown as BodyInit;
    }

    return new Response(bodyData, {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    console.error("R2 stream error for key:", fullKey, err);
    return new NextResponse("Media not found", { status: 404 });
  }
}
