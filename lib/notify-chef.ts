import { getRawDb } from "../db";
import { runtimeValue } from "./runtime";

type ConfirmedOrder = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  landmark: string;
  meal: string;
  total: number;
  paymentMethod: "cash" | "upi";
  items: Array<{ name: string; quantity: number }>;
};

function orderMessage(order: ConfirmedOrder) {
  const items = order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");
  return [
    `New ${order.meal} order ${order.id}`,
    `${order.customerName} · ${order.phone}`,
    items,
    `Collect ₹${order.total} by ${order.paymentMethod === "cash" ? "cash" : "direct UPI"} at delivery`,
    `Deliver to: ${order.address}${order.landmark ? `, near ${order.landmark}` : ""}`,
  ].join("\n");
}

async function hmacSignature(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function notifyChef(order: ConfirmedOrder) {
  const db = getRawDb();
  const now = Date.now();
  await db.prepare(`INSERT INTO notification_events (id, order_id, channel, status, detail, created_at) VALUES (?, ?, 'dashboard', 'sent', ?, ?)`).bind(crypto.randomUUID(), order.id, "Visible in chef order queue", now).run();

  const relayUrl = runtimeValue("ORDER_RELAY_URL");
  const relaySecret = runtimeValue("ORDER_RELAY_SECRET");
  if (!relayUrl || !relaySecret) {
    await db.prepare(`INSERT INTO notification_events (id, order_id, channel, status, detail, created_at) VALUES (?, ?, 'whatsapp', 'needs_setup', ?, ?)`).bind(crypto.randomUUID(), order.id, "Configure a WhatsApp Business relay URL and signing secret", now).run();
    return "needs_setup" as const;
  }

  const body = JSON.stringify({ type: "confirmed_order", order, message: orderMessage(order), occurredAt: new Date(now).toISOString() });
  try {
    const signature = await hmacSignature(relaySecret, body);
    const response = await fetch(relayUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-SB-Signature": signature }, body });
    if (!response.ok) throw new Error(`Relay returned HTTP ${response.status}`);
    await db.prepare(`INSERT INTO notification_events (id, order_id, channel, status, detail, created_at) VALUES (?, ?, 'whatsapp', 'sent', ?, ?)`).bind(crypto.randomUUID(), order.id, "Signed order payload accepted by relay", now).run();
    return "sent" as const;
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 300) : "Unknown relay failure";
    await db.prepare(`INSERT INTO notification_events (id, order_id, channel, status, detail, created_at) VALUES (?, ?, 'whatsapp', 'failed', ?, ?)`).bind(crypto.randomUUID(), order.id, detail, now).run();
    return "failed" as const;
  }
}

export function buildWhatsAppCustomerLink(order: ConfirmedOrder, chefNumber: string) {
  const digits = chefNumber.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(orderMessage(order))}`;
}
