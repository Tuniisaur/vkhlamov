import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/utils/serverAuth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Disconnesso con successo",
  });
  clearSessionCookie(response);
  return response;
}
