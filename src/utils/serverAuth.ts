import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "vkhlamov_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const DATA_DIR = path.join(process.cwd(), "src", "data");
const AUTH_STORE_PATH = path.join(DATA_DIR, ".auth-store.json");
const SERVER_SECRET_PATH = path.join(DATA_DIR, ".server-secret.json");

// Initial seed PIN from private environment variable (fallback if no hash store exists)
const DEFAULT_INITIAL_PIN = process.env.ADMIN_PIN || "vkhlamov-initial-pin";

// ── In-Memory Rate Limiter (Brute-Force Protection) ──
interface RateLimitRecord {
  failedAttempts: number;
  lockedUntil: number;
  lastAttempt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.lockedUntil && now - record.lastAttempt > LOCKOUT_DURATION_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemainingSeconds: number;
} {
  const record = rateLimitMap.get(ip);
  const now = Date.now();

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutRemainingSeconds: 0 };
  }

  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingSeconds: remainingSeconds,
    };
  }

  // If lockout expired, reset attempts
  if (record.lockedUntil > 0 && now >= record.lockedUntil) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutRemainingSeconds: 0 };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts);
  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    lockoutRemainingSeconds: 0,
  };
}

export function recordLoginAttempt(
  ip: string,
  success: boolean
): {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemainingSeconds: number;
} {
  const now = Date.now();
  if (success) {
    rateLimitMap.delete(ip);
    return { allowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockoutRemainingSeconds: 0 };
  }

  let record = rateLimitMap.get(ip);
  if (!record || (record.lockedUntil > 0 && now >= record.lockedUntil)) {
    record = { failedAttempts: 0, lockedUntil: 0, lastAttempt: now };
  }

  record.failedAttempts += 1;
  record.lastAttempt = now;

  if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    rateLimitMap.set(ip, record);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutRemainingSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
    };
  }

  rateLimitMap.set(ip, record);
  return {
    allowed: true,
    remainingAttempts: MAX_FAILED_ATTEMPTS - record.failedAttempts,
    lockoutRemainingSeconds: 0,
  };
}

import { isR2Configured, getR2Content, putR2Content } from "@/utils/r2";

// ── Server Secret Management ──
let cachedServerSecret: string | null = null;
const FALLBACK_STATIC_SECRET = "vkhlamov-studio-fixed-session-auth-token-key-2026-ver-secure-hmac";

async function getServerSecret(): Promise<string> {
  if (cachedServerSecret) return cachedServerSecret;
  if (process.env.ADMIN_SECRET && process.env.ADMIN_SECRET.trim().length >= 16) {
    cachedServerSecret = process.env.ADMIN_SECRET.trim();
    return cachedServerSecret;
  }

  // Derive stable secret from R2_SECRET_ACCESS_KEY if available
  if (process.env.R2_SECRET_ACCESS_KEY && process.env.R2_SECRET_ACCESS_KEY.trim().length >= 16) {
    cachedServerSecret = crypto
      .createHash("sha256")
      .update(`vkhlamov-session-${process.env.R2_SECRET_ACCESS_KEY.trim()}`)
      .digest("hex");
    return cachedServerSecret;
  }

  try {
    const raw = await fs.readFile(SERVER_SECRET_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && typeof data.secret === "string" && data.secret.length >= 32) {
      cachedServerSecret = data.secret;
      return data.secret;
    }
  } catch {
    // Disk read failed (e.g. on serverless Vercel)
  }

  cachedServerSecret = FALLBACK_STATIC_SECRET;
  return cachedServerSecret;
}

// ── PBKDF2 Password Hashing (100,000 rounds, SHA-512) ──
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

interface StoredAuth {
  salt: string;
  hash: string;
  updatedAt: string;
}

const STATIC_DEFAULT_SALT = "e7b8c9d0f1a234567890abcdef1234567890abcdef1234567890abcdef123456";

async function getStoredAuth(): Promise<StoredAuth> {
  // 1. If R2 is configured, try reading stored auth from R2
  if (isR2Configured()) {
    try {
      const r2Auth = await getR2Content<StoredAuth>(".auth-store.json");
      if (r2Auth && r2Auth.salt && r2Auth.hash) {
        return r2Auth;
      }
    } catch {}
  }

  // 2. Try reading from local disk
  try {
    const raw = await fs.readFile(AUTH_STORE_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && data.salt && data.hash) {
      return data as StoredAuth;
    }
  } catch {
    // Disk read failed
  }

  // 3. Fallback to deterministic default PIN hash
  const salt = STATIC_DEFAULT_SALT;
  const hash = hashPassword(DEFAULT_INITIAL_PIN, salt);
  return {
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  };
}

export async function verifyAdminPin(providedPin: string): Promise<boolean> {
  if (!providedPin || typeof providedPin !== "string") return false;

  const stored = await getStoredAuth();
  const candidateHash = hashPassword(providedPin, stored.salt);

  const bufA = Buffer.from(candidateHash, "hex");
  const bufB = Buffer.from(stored.hash, "hex");

  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function updateAdminPin(newPin: string): Promise<void> {
  if (!newPin || typeof newPin !== "string" || newPin.length < 6) {
    throw new Error("Il nuovo PIN deve contenere almeno 6 caratteri");
  }

  const newSalt = crypto.randomBytes(32).toString("hex");
  const newHash = hashPassword(newPin, newSalt);

  const payload: StoredAuth = {
    salt: newSalt,
    hash: newHash,
    updatedAt: new Date().toISOString(),
  };

  if (isR2Configured()) {
    try {
      await putR2Content(".auth-store.json", payload);
    } catch (e) {
      console.warn("Could not save auth store to R2:", e);
    }
  }

  try {
    await fs.writeFile(AUTH_STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not persist auth store to disk:", err);
  }
}

// ── Cryptographic Session Token (HMAC-SHA256) ──
interface SessionPayload {
  v: number;
  iat: number;
  exp: number;
  jti: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) {
    b64 += "=";
  }
  return Buffer.from(b64, "base64").toString("utf-8");
}

export async function createSessionToken(): Promise<string> {
  const secret = await getServerSecret();
  const now = Date.now();
  const payload: SessionPayload = {
    v: 1,
    iat: now,
    exp: now + SESSION_DURATION_MS,
    jti: crypto.randomBytes(16).toString("hex"),
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(encodedPayload);
  const signature = hmac.digest("base64url");

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [encodedPayload, providedSignature] = parts;
  const secret = await getServerSecret();

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(encodedPayload);
  const expectedSignature = hmac.digest("base64url");

  const sigBufA = Buffer.from(providedSignature);
  const sigBufB = Buffer.from(expectedSignature);

  if (sigBufA.length !== sigBufB.length) return false;
  if (!crypto.timingSafeEqual(sigBufA, sigBufB)) return false;

  try {
    const rawPayload = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(rawPayload) as SessionPayload;

    if (!payload.exp || typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;

    return true;
  } catch {
    return false;
  }
}

export async function isRequestAuthenticated(req: Request | NextRequest): Promise<boolean> {
  // 1. Try from cookie header
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookiesList = cookieHeader.split(";").map((c) => c.trim());
    for (const c of cookiesList) {
      if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        const token = c.substring(SESSION_COOKIE_NAME.length + 1);
        if (await verifySessionToken(token)) return true;
      }
    }
  }

  // 2. Fallback: try next/headers cookies() if in server component/action
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token && (await verifySessionToken(token))) return true;
  } catch {
    // cookies() not available in raw Request handler
  }

  return false;
}

export function attachSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
