import { NextResponse } from "next/server";
import { Readable } from "stream";
import fs from "fs/promises";
import path from "path";
import { getR2Client, getR2BucketName, isR2Configured } from "@/utils/r2";
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

  // 1. First check local public/images folder (for local offline dev)
  try {
    const localFile = path.resolve(process.cwd(), "public", "images", filename);
    const stat = await fs.stat(localFile);
    if (stat.isFile()) {
      const buffer = await fs.readFile(localFile);
      const ext = path.extname(filename).toLowerCase();
      const contentType =
        ext === ".png" ? "image/png" :
        ext === ".webp" ? "image/webp" :
        ext === ".avif" ? "image/avif" :
        "image/jpeg";

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
  } catch {}

  // 2. Fallback to Cloudflare R2 if configured
  if (isR2Configured()) {
    const s3 = getR2Client();
    const bucket = getR2BucketName();

    const candidateKeys = [
      `images/${filename}`,
      filename,
    ];

    for (const r2Key of candidateKeys) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: r2Key,
        });
        const response = await s3.send(command);
        if (response.Body) {
          const contentType = response.ContentType || "image/jpeg";
          const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          };
          if (response.ContentLength !== undefined) {
            headers["Content-Length"] = response.ContentLength.toString();
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
            status: 200,
            headers,
          });
        }
      } catch {}
    }
  }

  return new NextResponse("Image Not Found", { status: 404 });
}
