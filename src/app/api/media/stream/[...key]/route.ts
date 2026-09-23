import { NextResponse } from "next/server";
import { getR2Client, getR2BucketName, isR2Configured } from "@/utils/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";

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

  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();

    // Check Range request header (useful for video scrubbing)
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

    const contentType = response.ContentType || "application/octet-stream";
    const isPartial = Boolean(response.ContentRange);

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };

    if (response.ContentLength !== undefined) {
      headers["Content-Length"] = response.ContentLength.toString();
    }
    if (response.ContentRange) {
      headers["Content-Range"] = response.ContentRange;
    }

    // Stream response
    const stream = response.Body.transformToWebStream();

    return new NextResponse(stream, {
      status: isPartial ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    console.error("R2 stream error for key:", fullKey, err);
    return new NextResponse("Media not found", { status: 404 });
  }
}
