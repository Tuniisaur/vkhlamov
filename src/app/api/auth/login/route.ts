import { NextResponse } from "next/server";
import {
  getClientIp,
  checkRateLimit,
  recordLoginAttempt,
  verifyAdminPin,
  createSessionToken,
  attachSessionCookie,
} from "@/utils/serverAuth";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // 1. Check rate limit
  const rateLimitStatus = checkRateLimit(ip);
  if (!rateLimitStatus.allowed) {
    return NextResponse.json(
      {
        error: "Troppi tentativi falliti. Accesso temporaneamente bloccato per sicurezza.",
        lockoutRemainingSeconds: rateLimitStatus.lockoutRemainingSeconds,
      },
      { status: 429 }
    );
  }

  // 2. Artificial delay to thwart automated high-speed brute-force scripts
  await new Promise((resolve) => setTimeout(resolve, 350));

  try {
    const body = await req.json();
    const pin = typeof body.pin === "string" ? body.pin : "";

    if (!pin) {
      recordLoginAttempt(ip, false);
      return NextResponse.json({ error: "PIN richiesto" }, { status: 400 });
    }

    // 3. Cryptographic constant-time verification
    const isValid = await verifyAdminPin(pin);

    if (!isValid) {
      const attemptResult = recordLoginAttempt(ip, false);
      return NextResponse.json(
        {
          error: "PIN non corretto",
          remainingAttempts: attemptResult.remainingAttempts,
          lockoutRemainingSeconds: attemptResult.lockoutRemainingSeconds,
        },
        { status: 401 }
      );
    }

    // 4. Success: reset rate limit and issue secure HttpOnly cookie
    recordLoginAttempt(ip, true);
    const token = await createSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Autenticazione riuscita",
    });

    attachSessionCookie(response, token);
    return response;
  } catch (err: unknown) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Errore durante l'autenticazione" }, { status: 500 });
  }
}
