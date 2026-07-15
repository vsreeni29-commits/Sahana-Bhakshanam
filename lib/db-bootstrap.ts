import { getRawDb } from "../db";

let bootstrapPromise: Promise<void> | undefined;

export function ensureDatabase() {
  bootstrapPromise ??= bootstrapDatabase();
  return bootstrapPromise;
}

async function bootstrapDatabase() {
  const db = getRawDb();
  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, phone TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'consumer', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS otp_challenges (id TEXT PRIMARY KEY NOT NULL, phone TEXT NOT NULL, purpose TEXT NOT NULL, provider TEXT NOT NULL, provider_ref TEXT, code_hash TEXT, attempts INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, phone TEXT NOT NULL, role TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS chef_profiles (id INTEGER PRIMARY KEY NOT NULL, kitchen_name TEXT NOT NULL, chef_name TEXT NOT NULL, locality TEXT NOT NULL, whatsapp_number TEXT NOT NULL, upi_id TEXT NOT NULL, bio TEXT NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS meal_slots (key TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, order_open_minute INTEGER NOT NULL, cutoff_minute INTEGER NOT NULL, delivery_label TEXT NOT NULL, cutoff_label TEXT NOT NULL, available INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS menu_items (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, price INTEGER NOT NULL, image TEXT NOT NULL, meal TEXT NOT NULL, tag TEXT NOT NULL, portions INTEGER NOT NULL, available INTEGER NOT NULL DEFAULT 1, vegetarian INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, phone TEXT NOT NULL, customer_name TEXT NOT NULL, address TEXT NOT NULL, landmark TEXT NOT NULL DEFAULT '', meal TEXT NOT NULL, total INTEGER NOT NULL, payment_method TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', notification_status TEXT NOT NULL DEFAULT 'queued', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS order_items (id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL, menu_item_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS notification_events (id TEXT PRIMARY KEY NOT NULL, order_id TEXT NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS otp_phone_created_idx ON otp_challenges(phone, created_at)`,
    `CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at)`,
    `CREATE INDEX IF NOT EXISTS menu_meal_available_idx ON menu_items(meal, available, sort_order)`,
    `CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders(status, created_at)`,
    `CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id)`,
    `CREATE INDEX IF NOT EXISTS notification_order_idx ON notification_events(order_id, created_at)`,
  ];
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));

  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO chef_profiles (id, kitchen_name, chef_name, locality, whatsapp_number, upi_id, bio, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`).bind(
      "Sahana Bhakshanam",
      "Home-cooked by Sahana",
      "Tambaram, Chennai",
      "",
      "",
      "Pure vegetarian Tamil Brahmin Iyer food, cooked fresh at home for each fixed meal window.",
      now,
    ),
    db.prepare(`INSERT OR IGNORE INTO meal_slots (key, name, order_open_minute, cutoff_minute, delivery_label, cutoff_label, available, updated_at) VALUES ('breakfast', 'Breakfast', 1080, 420, '7:30–9:30 AM', '7:00 AM', 1, ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO meal_slots (key, name, order_open_minute, cutoff_minute, delivery_label, cutoff_label, available, updated_at) VALUES ('lunch', 'Lunch', 480, 660, '12:30–2:00 PM', '11:00 AM', 1, ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO meal_slots (key, name, order_open_minute, cutoff_minute, delivery_label, cutoff_label, available, updated_at) VALUES ('snacks', 'Evening snacks', 720, 960, '4:30–6:00 PM', '4:00 PM', 1, ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO meal_slots (key, name, order_open_minute, cutoff_minute, delivery_label, cutoff_label, available, updated_at) VALUES ('dinner', 'Dinner', 900, 1170, '7:30–9:30 PM', '7:30 PM', 1, ?)`).bind(now),
    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order, created_at, updated_at) VALUES ('sahana-iyer-saapadu', 'Sahana Iyer Saapadu', 'Rice, paruppu & ghee, arachuvitta sambar, rasam, paruppu usili, curd & appalam', 179, '/food/hero-iyer-saapadu.webp', 'lunch', 'Iyer special', 8, 1, 1, 1, ?, ?)`).bind(now, now),
    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order, created_at, updated_at) VALUES ('veg-sambar-rice', 'Arachuvitta Sambar Sadam', 'Iyer-style sambar sadam, appalam & homemade pickle', 139, '/food/meal-veg-sambar.webp', 'lunch', 'Iyer classic', 12, 1, 1, 2, ?, ?)`).bind(now, now),
    db.prepare(`INSERT OR IGNORE INTO menu_items (id, name, description, price, image, meal, tag, portions, available, vegetarian, sort_order, created_at, updated_at) VALUES ('ragi-dosa', 'Ragi dosa set', 'Two ragi dosas with coconut & tomato chutney', 119, '/food/meal-ragi-dosa.webp', 'breakfast', 'Wholesome', 5, 1, 1, 3, ?, ?)`).bind(now, now),
  ]);

  await db.batch([
    db.prepare(`UPDATE chef_profiles SET kitchen_name = 'Sahana Bhakshanam', chef_name = 'Home-cooked by Sahana', upi_id = '', bio = 'Pure vegetarian Tamil Brahmin Iyer food, cooked fresh at home for each fixed meal window.', updated_at = ? WHERE id = 1 AND kitchen_name IN ('Meena’s Home Kitchen', 'Namma Veetu Samayal')`).bind(now),
    db.prepare(`DELETE FROM menu_items WHERE vegetarian = 0`),
    db.prepare(`UPDATE menu_items SET name = 'Arachuvitta Sambar Sadam', description = 'Iyer-style sambar sadam, appalam & homemade pickle', tag = 'Iyer classic', vegetarian = 1, updated_at = ? WHERE id = 'veg-sambar-rice' AND name = 'Veg sambar rice'`).bind(now),
  ]);
}
