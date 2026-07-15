import { getRawDb } from "../../../db";
import { ensureDatabase } from "../../../lib/db-bootstrap";

export async function GET() {
  await ensureDatabase();
  const db = getRawDb();
  const [profile, slots, menu] = await Promise.all([
    db.prepare(`SELECT kitchen_name AS kitchenName, chef_name AS chefName, locality, whatsapp_number AS whatsappNumber, upi_id AS upiId, bio FROM chef_profiles WHERE id = 1`).first(),
    db.prepare(`SELECT key, name, order_open_minute AS orderOpenMinute, cutoff_minute AS cutoffMinute, delivery_label AS deliveryLabel, cutoff_label AS cutoffLabel, available FROM meal_slots ORDER BY CASE key WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'snacks' THEN 3 ELSE 4 END`).all(),
    db.prepare(`SELECT id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order AS sortOrder FROM menu_items WHERE vegetarian = 1 ORDER BY sort_order, name`).all(),
  ]);
  return Response.json({ profile, slots: slots.results, menu: menu.results });
}
