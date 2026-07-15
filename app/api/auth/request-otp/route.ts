import { getRawDb } from "../../../../db";
import { hashOtp, isChefPhone, normalizeIndianPhone } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";
import { isDemoOtpEnabled, runtimeValue } from "../../../../lib/runtime";
import { hasTwilioVerify, sendTwilioOtp } from "../../../../lib/twilio-verify";

export async function POST(request: Request) {
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { phone?: string; purpose?: string };
  const phone = normalizeIndianPhone(payload.phone ?? "");
  const purpose = payload.purpose === "chef" ? "chef" : "consumer";
  if (!phone) return Response.json({ error: "Enter a valid Indian mobile number." }, { status: 400 });

  if (purpose === "chef" && !isChefPhone(phone)) {
    return Response.json({ error: "This number is not registered as the chef account." }, { status: 403 });
  }

  const now = Date.now();
  const recent = await getRawDb()
    .prepare(`SELECT COUNT(*) AS count FROM otp_challenges WHERE phone = ? AND created_at > ?`)
    .bind(phone, now - 10 * 60 * 1000)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= 3) {
    return Response.json({ error: "Too many OTP requests. Try again in 10 minutes." }, { status: 429 });
  }

  const id = crypto.randomUUID();
  const expiresAt = now + 5 * 60 * 1000;
  if (hasTwilioVerify()) {
    const providerRef = await sendTwilioOtp(phone);
    await getRawDb().prepare(`INSERT INTO otp_challenges (id, phone, purpose, provider, provider_ref, code_hash, attempts, expires_at, used_at, created_at) VALUES (?, ?, ?, 'twilio', ?, NULL, 0, ?, NULL, ?)`).bind(id, phone, purpose, providerRef, expiresAt, now).run();
    return Response.json({ ok: true, expiresIn: 300 });
  }

  if (!isDemoOtpEnabled()) {
    return Response.json({ error: "SMS OTP is not configured yet." }, { status: 503 });
  }

  const demoCode = runtimeValue("OTP_DEMO_CODE") ?? "";
  if (!/^\d{6}$/.test(demoCode)) {
    return Response.json({ error: "SMS OTP is not configured yet." }, { status: 503 });
  }
  const codeHash = await hashOtp(phone, demoCode);
  await getRawDb().prepare(`INSERT INTO otp_challenges (id, phone, purpose, provider, provider_ref, code_hash, attempts, expires_at, used_at, created_at) VALUES (?, ?, ?, 'demo', NULL, ?, 0, ?, NULL, ?)`).bind(id, phone, purpose, codeHash, expiresAt, now).run();
  return Response.json({ ok: true, expiresIn: 300, demo: true });
}
