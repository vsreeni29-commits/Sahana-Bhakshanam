import { runtimeValue } from "./runtime";

function twilioConfig() {
  const accountSid = runtimeValue("TWILIO_ACCOUNT_SID");
  const authToken = runtimeValue("TWILIO_AUTH_TOKEN");
  const serviceSid = runtimeValue("TWILIO_VERIFY_SERVICE_SID");
  return accountSid && authToken && serviceSid ? { accountSid, authToken, serviceSid } : null;
}

function authHeader(accountSid: string, authToken: string) {
  return `Basic ${btoa(`${accountSid}:${authToken}`)}`;
}

export function hasTwilioVerify() {
  return Boolean(twilioConfig());
}

export async function sendTwilioOtp(phone: string) {
  const config = twilioConfig();
  if (!config) throw new Error("Twilio Verify is not configured");
  const body = new URLSearchParams({ To: phone, Channel: "sms" });
  const response = await fetch(`https://verify.twilio.com/v2/Services/${config.serviceSid}/Verifications`, {
    method: "POST",
    headers: { Authorization: authHeader(config.accountSid, config.authToken), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as { sid?: string; message?: string };
  if (!response.ok || !result.sid) throw new Error(result.message ?? "OTP provider rejected the request");
  return result.sid;
}

export async function checkTwilioOtp(phone: string, code: string) {
  const config = twilioConfig();
  if (!config) throw new Error("Twilio Verify is not configured");
  const body = new URLSearchParams({ To: phone, Code: code });
  const response = await fetch(`https://verify.twilio.com/v2/Services/${config.serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: { Authorization: authHeader(config.accountSid, config.authToken), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as { status?: string };
  return response.ok && result.status === "approved";
}
