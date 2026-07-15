import { getRawDb } from "../../../../db";
import { requireChef } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";
import { MealKey, MEAL_SLOTS } from "../../../../lib/schedule";

export async function PATCH(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { key?: MealKey; available?: boolean; cutoffMinute?: number };
  if (!payload.key || !MEAL_SLOTS.some((slot) => slot.key === payload.key) || typeof payload.available !== "boolean") return Response.json({ error: "Valid slot key and availability are required." }, { status: 400 });
  if (payload.cutoffMinute !== undefined) return Response.json({ error: "Cutoff times are fixed and cannot be overridden from the dashboard." }, { status: 403 });
  await getRawDb().prepare(`UPDATE meal_slots SET available = ?, updated_at = ? WHERE key = ?`).bind(payload.available ? 1 : 0, Date.now(), payload.key).run();
  return Response.json({ ok: true, key: payload.key, available: payload.available });
}
