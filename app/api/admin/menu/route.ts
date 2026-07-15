import { getRawDb } from "../../../../db";
import { requireChef } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";
import { MealKey } from "../../../../lib/schedule";

export async function GET(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const rows = await getRawDb().prepare(`SELECT id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order AS sortOrder FROM menu_items WHERE vegetarian = 1 ORDER BY sort_order, name`).all();
  return Response.json({ menu: rows.results });
}

export async function POST(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { name?: string; meal?: MealKey; price?: number; portions?: number; description?: string };
  if (!payload.name?.trim() || !payload.meal || !Number.isInteger(payload.price) || !Number.isInteger(payload.portions)) return Response.json({ error: "Dish name, meal, price, and portions are required." }, { status: 400 });
  const id = `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 34)}-${crypto.randomUUID().slice(0, 4)}`;
  const now = Date.now();
  await getRawDb().prepare(`INSERT INTO menu_items (id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, '/food/meal-veg-sambar.webp', ?, 'Today’s pure veg special', ?, 1, 1, 99, ?, ?)`).bind(id, payload.name.trim().slice(0, 90), (payload.description ?? "Pure vegetarian Iyer food, freshly prepared in today’s small batch.").trim().slice(0, 220), payload.price, payload.meal, payload.portions, now, now).run();
  return Response.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { id?: string; available?: boolean; portions?: number };
  if (!payload.id) return Response.json({ error: "Menu item id is required." }, { status: 400 });
  const current = await getRawDb().prepare(`SELECT available, portions FROM menu_items WHERE id = ?`).bind(payload.id).first<{ available: number; portions: number }>();
  if (!current) return Response.json({ error: "Menu item not found." }, { status: 404 });
  const available = typeof payload.available === "boolean" ? (payload.available ? 1 : 0) : current.available;
  const portions = Number.isInteger(payload.portions) ? Math.max(0, Math.min(999, payload.portions ?? current.portions)) : current.portions;
  await getRawDb().prepare(`UPDATE menu_items SET available = ?, portions = ?, updated_at = ? WHERE id = ?`).bind(available, portions, Date.now(), payload.id).run();
  return Response.json({ ok: true, item: { id: payload.id, available: Boolean(available), portions } });
}
