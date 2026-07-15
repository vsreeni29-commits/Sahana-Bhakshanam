import { getRawDb } from "../../../db";
import { getSession } from "../../../lib/auth";
import { ensureDatabase } from "../../../lib/db-bootstrap";
import { buildWhatsAppCustomerLink, notifyChef } from "../../../lib/notify-chef";
import { getSlotStates, MealKey } from "../../../lib/schedule";

type OrderPayload = {
  customerName?: string;
  address?: string;
  landmark?: string;
  meal?: MealKey;
  paymentMethod?: "cash" | "upi";
  items?: Array<{ id?: string; quantity?: number }>;
};

export async function POST(request: Request) {
  await ensureDatabase();
  const session = await getSession(request);
  if (!session) return Response.json({ error: "Verify your mobile number before confirming the order." }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as OrderPayload;
  const customerName = payload.customerName?.trim().slice(0, 80) ?? "";
  const address = payload.address?.trim().slice(0, 350) ?? "";
  const landmark = payload.landmark?.trim().slice(0, 120) ?? "";
  const paymentMethod: "cash" | "upi" = payload.paymentMethod === "upi" ? "upi" : "cash";
  const items = (payload.items ?? []).filter((item) => item.id && Number.isInteger(item.quantity) && (item.quantity ?? 0) > 0 && (item.quantity ?? 0) <= 10);
  if (!customerName || address.length < 10 || !payload.meal || !items.length || items.length > 8) {
    return Response.json({ error: "Name, complete delivery address, meal, and order items are required." }, { status: 400 });
  }

  const mealState = getSlotStates().find((slot) => slot.key === payload.meal);
  if (!mealState || mealState.state !== "open") {
    return Response.json({ error: `${mealState?.name ?? "This meal"} ordering is locked. Cutoff times cannot be overridden.` }, { status: 409 });
  }

  const db = getRawDb();
  const slotAvailability = await db.prepare(`SELECT available FROM meal_slots WHERE key = ?`).bind(payload.meal).first<{ available: number }>();
  if (!slotAvailability?.available) return Response.json({ error: "The chef has marked this meal session unavailable." }, { status: 409 });

  const resolved = [] as Array<{ id: string; name: string; meal: string; price: number; portions: number; available: number; vegetarian: number; quantity: number }>;
  for (const requested of items) {
    const item = await db.prepare(`SELECT id, name, meal, price, portions, available, vegetarian FROM menu_items WHERE id = ? LIMIT 1`).bind(requested.id).first<{ id: string; name: string; meal: string; price: number; portions: number; available: number; vegetarian: number }>();
    if (!item || !item.available || !item.vegetarian || item.meal !== payload.meal || item.portions < (requested.quantity ?? 0)) {
      return Response.json({ error: "One of the selected dishes is unavailable or has insufficient portions." }, { status: 409 });
    }
    resolved.push({ ...item, quantity: requested.quantity ?? 1 });
  }

  const total = resolved.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const now = Date.now();
  const orderId = `SB-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
  const statements = [
    db.prepare(`INSERT INTO orders (id, user_id, phone, customer_name, address, landmark, meal, total, payment_method, status, notification_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'queued', ?, ?)`).bind(orderId, session.userId, session.phone, customerName, address, landmark, payload.meal, total, paymentMethod, now, now),
    ...resolved.flatMap((item) => [
      db.prepare(`INSERT INTO order_items (id, order_id, menu_item_id, name, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)`).bind(crypto.randomUUID(), orderId, item.id, item.name, item.quantity, item.price),
      db.prepare(`UPDATE menu_items SET portions = portions - ?, updated_at = ? WHERE id = ? AND portions >= ?`).bind(item.quantity, now, item.id, item.quantity),
    ]),
  ];
  await db.batch(statements);

  const confirmedOrder = { id: orderId, customerName, phone: session.phone, address, landmark, meal: payload.meal, total, paymentMethod, items: resolved.map((item) => ({ name: item.name, quantity: item.quantity })) };
  const notificationStatus = await notifyChef(confirmedOrder);
  await db.prepare(`UPDATE orders SET notification_status = ?, updated_at = ? WHERE id = ?`).bind(notificationStatus, Date.now(), orderId).run();
  const chef = await db.prepare(`SELECT whatsapp_number AS whatsappNumber FROM chef_profiles WHERE id = 1`).first<{ whatsappNumber: string }>();
  return Response.json({
    ok: true,
    order: { id: orderId, total, paymentMethod, status: "new", meal: payload.meal },
    chefNotification: notificationStatus,
    whatsappUrl: chef?.whatsappNumber ? buildWhatsAppCustomerLink(confirmedOrder, chef.whatsappNumber) : null,
    paymentMessage: "No payment has been taken. Pay the chef by cash or direct UPI only when the order reaches your door.",
  }, { status: 201 });
}
