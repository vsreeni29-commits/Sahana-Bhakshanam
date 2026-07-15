import { getRawDb } from "../../../../db";
import { createSession, hashOtp, isChefPhone, normalizeIndianPhone } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";
import { checkTwilioOtp } from "../../../../lib/twilio-verify";

export async function POST(request: Request) {
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { phone?: string; code?: string; purpose?: string };
  const phone = normalizeIndianPhone(payload.phone ?? "");
  const code = (payload.code ?? "").replace(/\D/g, "");
  const purpose = payload.purpose === "chef" ? "chef" : "consumer";
  if (!phone || !/^\d{6}$/.test(code)) return Response.json({ error: "Enter the valid 6-digit OTP." }, { status: 400 });

  const challenge = await getRawDb()
    .prepare(`SELECT id, provider, code_hash AS codeHash, attempts, expires_at AS expiresAt FROM otp_challenges WHERE phone = ? AND purpose = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(phone, purpose)
    .first<{ id: string; provider: "twilio" | "demo"; codeHash: string | null; attempts: number; expiresAt: number }>();
  if (!challenge || challenge.expiresAt <= Date.now()) return Response.json({ error: "That OTP has expired. Request a new one." }, { status: 400 });
  if (challenge.attempts >= 5) return Response.json({ error: "Too many incorrect attempts. Request a new OTP." }, { status: 429 });

  const valid = challenge.provider === "twilio"
    ? await checkTwilioOtp(phone, code)
    : (await hashOtp(phone, code)) === challenge.codeHash;

  if (!valid) {
    await getRawDb().prepare(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?`).bind(challenge.id).run();
    return Response.json({ error: "That OTP is incorrect." }, { status: 400 });
  }

  const now = Date.now();
  await getRawDb().prepare(`UPDATE otp_challenges SET used_at = ? WHERE id = ?`).bind(now, challenge.id).run();
  const role = isChefPhone(phone) ? "chef" : "consumer";
  if (purpose === "chef" && role !== "chef") return Response.json({ error: "Chef access denied." }, { status: 403 });

  const existing = await getRawDb().prepare(`SELECT id FROM users WHERE phone = ? LIMIT 1`).bind(phone).first<{ id: string }>();
  const userId = existing?.id ?? crypto.randomUUID();
  await getRawDb().prepare(`INSERT INTO users (id, phone, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(phone) DO UPDATE SET role = excluded.role, updated_at = excluded.updated_at`).bind(userId, phone, role, now, now).run();
  const cookie = await createSession({ userId, phone, role }, request);
  return Response.json({ ok: true, user: { phone, role } }, { headers: { "Set-Cookie": cookie } });
}
