import { NextResponse } from "next/server";
import { isRequestAuthenticated } from "@/utils/serverAuth";

export async function GET(req: Request) {
  const authenticated = await isRequestAuthenticated(req);
  return NextResponse.json({ authenticated });
}
