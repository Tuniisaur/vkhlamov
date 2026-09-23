import { NextResponse } from "next/server";
import {
  isR2Configured,
  getR2Status,
  getR2AccountId,
  getR2BucketName,
  getR2PublicBase,
  getR2Client,
  listR2Objects,
} from "@/utils/r2";
import { isRequestAuthenticated } from "@/utils/serverAuth";

export async function GET(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  const r2Status = getR2Status();
  const accountId = getR2AccountId();
  const bucketName = getR2BucketName();
  const rawPublicUrl = process.env.R2_PUBLIC_URL || "";
  const cleanedPublicBase = getR2PublicBase();

  let s3ConnectionSuccess = false;
  let s3Error: string | null = null;
  let objectsList: { videosCount: number; imagesCount: number; keysSample: string[] } = {
    videosCount: 0,
    imagesCount: 0,
    keysSample: [],
  };

  if (isR2Configured()) {
    try {
      const media = await listR2Objects();
      s3ConnectionSuccess = true;
      const allKeys = [
        ...media.videos.map((v) => v.key),
        ...media.images.map((i) => i.key),
      ];
      objectsList = {
        videosCount: media.videos.length,
        imagesCount: media.images.length,
        keysSample: allKeys.slice(0, 10),
      };
    } catch (err: unknown) {
      s3Error = err instanceof Error ? err.message : String(err);
    }
  }

  // Test public URL accessibility if configured
  let publicUrlStatus: {
    tested: boolean;
    accessible: boolean;
    httpStatus?: number;
    error?: string;
  } = {
    tested: false,
    accessible: false,
  };

  if (cleanedPublicBase && objectsList.keysSample.length > 0) {
    const testKey = objectsList.keysSample[0];
    const testUrl = `${cleanedPublicBase}/${testKey}`;
    try {
      const testRes = await fetch(testUrl, { method: "HEAD", signal: AbortSignal.timeout(4000) });
      publicUrlStatus = {
        tested: true,
        accessible: testRes.ok,
        httpStatus: testRes.status,
      };
    } catch (err: unknown) {
      publicUrlStatus = {
        tested: true,
        accessible: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const recommendations: string[] = [];

  if (!r2Status.configured) {
    recommendations.push(
      `Variabili Cloudflare R2 mancanti su Vercel: ${r2Status.missing.join(", ")}`
    );
  } else if (!s3ConnectionSuccess) {
    recommendations.push(
      `Impossibile connettersi al bucket R2: ${s3Error}. Verifica permessi Object Read & Write.`
    );
  } else {
    if (objectsList.videosCount === 0 && objectsList.imagesCount === 0) {
      recommendations.push(
        "Il bucket Cloudflare R2 è attualmente VUOTO. Carica i tuoi primi video e immagini dalla scheda Media."
      );
    }

    if (!rawPublicUrl) {
      recommendations.push(
        "R2_PUBLIC_URL non è impostata. I file vengono serviti tramite lo Streaming Proxy Next.js (/api/media/stream/)."
      );
    } else if (publicUrlStatus.tested && !publicUrlStatus.accessible) {
      recommendations.push(
        `R2_PUBLIC_URL (${rawPublicUrl}) restituisce HTTP ${publicUrlStatus.httpStatus || "Errore"}. Assicurati di aver cliccato 'Allow Access' sul sottodominio r2.dev nel pannello Cloudflare.`
      );
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    r2Configured: r2Status.configured,
    missingEnvVars: r2Status.missing,
    accountIdMasked: accountId ? `${accountId.slice(0, 4)}...${accountId.slice(-4)}` : "",
    bucketName,
    rawPublicUrl,
    cleanedPublicBase,
    s3ConnectionSuccess,
    s3Error,
    objectsList,
    publicUrlStatus,
    recommendations,
  });
}
