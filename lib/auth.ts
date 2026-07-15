import { getRawDb } from "../db";
import { ensureDatabase } from "./db-bootstrap";
import { runtimeValue } from "./runtime";

const SESSION_COOKIE = "nvs_session";
const encoder = new TextEncoder();

export type AppSession = {
  userId: string;
  phone: string;
  role: "consumer" | "chef";
};

export function normalizeIndianPhone(input: string) {
  const digits = input.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(local)) return null;
  return `+91${local}`;
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function hashOtp(phone: string, code: string) {
  const secret = runtimeValue("OTP_HASH_SECRET") ?? "prototype-otp-hash-not-for-production";
  return sha256(`${secret}:${phone}:${code}`);
}

export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key === name)?.[1];
}

export async function getSession(request: Request): Promise<AppSession | null> {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  await ensureDatabase();
  const tokenHash = await sha256(token);
  const row = await getRawDb()
    .prepare(`SELECT user_id AS userId, phone, role, expires_at AS expiresAt FROM sessions WHERE token_hash = ? LIMIT 1`)
    .bind(tokenHash)
    .first<{ userId: string; phone: string; role: "consumer" | "chef"; expiresAt: number }>();
  if (!row || row.expiresAt <= Date.now()) return null;
  return { userId: row.userId, phone: row.phone, role: row.role };
}

export async function createSession(user: AppSession, request: Request) {
  await ensureDatabase();
  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  await getRawDb()
    .prepare(`INSERT INTO sessions (token_hash, user_id, phone, role, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(tokenHash, user.userId, user.phone, user.role, expiresAt, now)
    .run();
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function requireChef(request: Request) {
  const session = await getSession(request);
  return session?.role === "chef" ? session : null;
}
