import { getRawDb } from "../../../../db";
import { requireChef } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";

const allowedStatuses = ["new", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"];

export async function GET(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const db = getRawDb();
  const orders = await db.prepare(`SELECT id, phone, customer_name AS customerName, address, landmark, meal, total, payment_method AS paymentMethod, status, notification_status AS notificationStatus, created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 50`).all<Record<string, unknown>>();
  const enriched = [];
  for (const order of orders.results) {
    const items = await db.prepare(`SELECT name, quantity, unit_price AS unitPrice FROM order_items WHERE order_id = ?`).bind(order.id).all();
    enriched.push({ ...order, items: items.results });
  }
  return Response.json({ orders: enriched });
}

export async function PATCH(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!payload.id || !payload.status || !allowedStatuses.includes(payload.status)) return Response.json({ error: "Order id and valid status are required." }, { status: 400 });
  await getRawDb().prepare(`UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`).bind(payload.status, Date.now(), payload.id).run();
  return Response.json({ ok: true, id: payload.id, status: payload.status });
}
