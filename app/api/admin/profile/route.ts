import { getRawDb } from "../../../../db";
import { requireChef } from "../../../../lib/auth";
import { ensureDatabase } from "../../../../lib/db-bootstrap";

export async function PUT(request: Request) {
  if (!(await requireChef(request))) return Response.json({ error: "Chef access required." }, { status: 401 });
  await ensureDatabase();
  const payload = (await request.json().catch(() => ({}))) as { kitchenName?: string; chefName?: string; locality?: string; whatsappNumber?: string; upiId?: string; bio?: string };
  const values = [payload.kitchenName, payload.chefName, payload.locality].map((value) => value?.trim() ?? "");
  if (values.some((value) => !value)) return Response.json({ error: "Kitchen name, chef name, and locality are required." }, { status: 400 });
  await getRawDb().prepare(`UPDATE chef_profiles SET kitchen_name = ?, chef_name = ?, locality = ?, whatsapp_number = ?, upi_id = ?, bio = ?, updated_at = ? WHERE id = 1`).bind(values[0].slice(0, 100), values[1].slice(0, 80), values[2].slice(0, 120), (payload.whatsappNumber ?? "").replace(/[^+\d]/g, "").slice(0, 16), (payload.upiId ?? "").trim().slice(0, 100), (payload.bio ?? "").trim().slice(0, 300), Date.now()).run();
  return Response.json({ ok: true });
}
