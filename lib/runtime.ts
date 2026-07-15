import { getRuntimeBindings } from "./request-bindings";

type RuntimeKey =
  | "OTP_DEMO_MODE"
  | "OTP_HASH_SECRET"
  | "SESSION_COOKIE_SECURE"
  | "CHEF_PHONE_E164"
  | "TWILIO_ACCOUNT_SID"
  | "TWILIO_AUTH_TOKEN"
  | "TWILIO_VERIFY_SERVICE_SID"
  | "ORDER_RELAY_URL"
  | "ORDER_RELAY_SECRET";

export function runtimeValue(key: RuntimeKey) {
  const values = getRuntimeBindings() as Record<string, string | undefined>;
  return values[key]?.trim() || undefined;
}

export function isDemoOtpEnabled() {
  return runtimeValue("OTP_DEMO_MODE") === "true";
}
