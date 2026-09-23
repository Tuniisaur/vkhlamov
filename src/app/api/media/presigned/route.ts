import { NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/utils/serverAuth";
import { isR2Configured, createR2PresignedUpload } from "@/utils/r2";

const ALLOWED_VIDEO_EXTS = [".mp4", ".webm", ".mov"];
const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif"];

export async function POST(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json({ r2: false });
  }

  try {
    const { filename, contentType, folder } = await req.json();

    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "Nome file obbligatorio" }, { status: 400 });
    }

    const ext = "." + filename.split(".").pop()?.toLowerCase();
    const isVideo = ALLOWED_VIDEO_EXTS.includes(ext);
    const isImage = ALLOWED_IMAGE_EXTS.includes(ext);

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: "Estensione file non consentita. Formati ammessi: MP4, MOV, WEBM, JPG, PNG, WEBP, AVIF" },
        { status: 400 }
      );
    }

    const presigned = await createR2PresignedUpload({
      filename,
      contentType: contentType || (isVideo ? "video/mp4" : "image/jpeg"),
      folder: folder || (isVideo ? "videos" : "images"),
    });

    return NextResponse.json({
      r2: true,
      uploadUrl: presigned.uploadUrl,
      publicUrl: presigned.publicUrl,
      key: presigned.key,
    });
  } catch (err: unknown) {
    console.error("Presigned URL error:", err);
    const msg = err instanceof Error ? err.message : "Errore generazione upload";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
