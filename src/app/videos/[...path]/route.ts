import { NextResponse } from "next/server";
import { Readable } from "stream";
import fs from "fs/promises";
import path from "path";
import { getR2Client, getR2BucketName, isR2Configured, getR2PublicBase } from "@/utils/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const filename = pathSegments.join("/");

  // 1. Check local public/videos folder (for local offline dev)
  try {
    const localFile = path.resolve(process.cwd(), "public", "videos", filename);
    const stat = await fs.stat(localFile);
    if (stat.isFile()) {
      const buffer = await fs.readFile(localFile);
      const ext = path.extname(filename).toLowerCase();
      const contentType =
        ext === ".webm" ? "video/webm" :
        ext === ".mov" ? "video/quicktime" :
        "video/mp4";

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Accept-Ranges": "bytes",
        },
      });
    }
  } catch {}

  // 2. Fallback to Cloudflare R2 if configured
  if (isR2Configured()) {
    const publicBase = getR2PublicBase();
    if (publicBase && !publicBase.includes("r2.cloudflarestorage.com")) {
      const targetKey = filename.startsWith("videos/") ? filename : `videos/${filename}`;
      return NextResponse.redirect(`${publicBase}/${targetKey}`, 307);
    }
    const s3 = getR2Client();
    const bucket = getR2BucketName();
    const rangeHeader = req.headers.get("range");

    const candidateKeys = [
      `videos/${filename}`,
      filename,
    ];

    for (const r2Key of candidateKeys) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: r2Key,
          ...(rangeHeader ? { Range: rangeHeader } : {}),
        });
        const response = await s3.send(command);
        if (response.Body) {
          const contentType = response.ContentType || (
            filename.endsWith(".mov") ? "video/quicktime" :
            filename.endsWith(".webm") ? "video/webm" :
            "video/mp4"
          );
          const isPartial = Boolean(response.ContentRange);

          const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
          };
          if (response.ContentLength !== undefined) {
            headers["Content-Length"] = response.ContentLength.toString();
          }
          if (response.ContentRange) {
            headers["Content-Range"] = response.ContentRange;
          }

          let bodyData: BodyInit;
          if (typeof (response.Body as any)?.transformToWebStream === "function") {
            bodyData = (response.Body as any).transformToWebStream();
          } else if (response.Body instanceof Readable) {
            bodyData = Readable.toWeb(response.Body) as ReadableStream;
          } else if (typeof (response.Body as any)?.transformToByteArray === "function") {
            bodyData = await (response.Body as any).transformToByteArray();
          } else {
            bodyData = response.Body as unknown as BodyInit;
          }

          return new Response(bodyData, {
            status: isPartial ? 206 : 200,
            headers,
          });
        }
      } catch {}
    }
  }

  return new NextResponse("Video Not Found", { status: 404 });
}
