import { NextResponse } from "next/server";
import { isRequestAuthenticated, verifyAdminPin, updateAdminPin } from "@/utils/serverAuth";

export async function POST(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  if (!authenticated) {
    return NextResponse.json({ error: "Accesso non autorizzato" }, { status: 401 });
  }

  try {
    const { currentPin, newPin } = await req.json();

    if (!currentPin || !newPin) {
      return NextResponse.json(
        { error: "PIN attuale e nuovo PIN sono obbligatori" },
        { status: 400 }
      );
    }

    if (typeof newPin !== "string" || newPin.length < 6) {
      return NextResponse.json(
        { error: "Il nuovo PIN deve contenere almeno 6 caratteri" },
        { status: 400 }
      );
    }

    const isCurrentValid = await verifyAdminPin(currentPin);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "PIN attuale errato" }, { status: 403 });
    }

    await updateAdminPin(newPin);

    return NextResponse.json({
      success: true,
      message: "PIN aggiornato con successo sul server.",
    });
  } catch (err: unknown) {
    console.error("Change pin error:", err);
    const msg = err instanceof Error ? err.message : "Errore durante l'aggiornamento del PIN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
