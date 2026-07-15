import { AsyncLocalStorage } from "node:async_hooks";

export type RuntimeBindings = {
  DB?: D1Database;
  OTP_DEMO_MODE?: string;
  OTP_DEMO_CODE?: string;
  OTP_HASH_SECRET?: string;
  SESSION_COOKIE_SECURE?: string;
  CHEF_PHONE_E164?: string;
  CHEF_PHONE_E164_LIST?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  ORDER_RELAY_URL?: string;
  ORDER_RELAY_SECRET?: string;
};

const runtimeBindings = new AsyncLocalStorage<RuntimeBindings>();

export function runWithRuntimeBindings<T>(
  bindings: RuntimeBindings,
  callback: () => T,
): T {
  return runtimeBindings.run(bindings, callback);
}

export function getRuntimeBindings(): RuntimeBindings {
  return runtimeBindings.getStore() ?? {};
}
