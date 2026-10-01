import { NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/utils/serverAuth";
import { getR2StorageUsage } from "@/utils/r2";

export async function GET(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const storage = await getR2StorageUsage();
    return NextResponse.json({ success: true, storage });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore recupero statistiche storage";
    console.error("Storage route error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
