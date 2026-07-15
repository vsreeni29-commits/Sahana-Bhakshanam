import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    role: text("role", { enum: ["consumer", "chef"] }).notNull().default("consumer"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [uniqueIndex("users_phone_unique").on(table.phone)],
);

export const otpChallenges = sqliteTable(
  "otp_challenges",
  {
    id: text("id").primaryKey(),
    phone: text("phone").notNull(),
    purpose: text("purpose", { enum: ["consumer", "chef"] }).notNull(),
    provider: text("provider", { enum: ["twilio", "demo"] }).notNull(),
    providerRef: text("provider_ref"),
    codeHash: text("code_hash"),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("otp_phone_created_idx").on(table.phone, table.createdAt)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    phone: text("phone").notNull(),
    role: text("role", { enum: ["consumer", "chef"] }).notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId), index("sessions_expiry_idx").on(table.expiresAt)],
);

export const chefProfiles = sqliteTable("chef_profiles", {
  id: integer("id").primaryKey(),
  kitchenName: text("kitchen_name").notNull(),
  chefName: text("chef_name").notNull(),
  locality: text("locality").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  upiId: text("upi_id").notNull(),
  bio: text("bio").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const mealSlots = sqliteTable("meal_slots", {
  key: text("key", { enum: ["breakfast", "lunch", "snacks", "dinner"] }).primaryKey(),
  name: text("name").notNull(),
  orderOpenMinute: integer("order_open_minute").notNull(),
  cutoffMinute: integer("cutoff_minute").notNull(),
  deliveryLabel: text("delivery_label").notNull(),
  cutoffLabel: text("cutoff_label").notNull(),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at").notNull(),
});

export const menuItems = sqliteTable(
  "menu_items",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: integer("price").notNull(),
    image: text("image").notNull(),
    meal: text("meal", { enum: ["breakfast", "lunch", "snacks", "dinner"] }).notNull(),
    tag: text("tag").notNull(),
    portions: integer("portions").notNull(),
    available: integer("available", { mode: "boolean" }).notNull().default(true),
    vegetarian: integer("vegetarian", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("menu_meal_available_idx").on(table.meal, table.available, table.sortOrder)],
);

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    phone: text("phone").notNull(),
    customerName: text("customer_name").notNull(),
    address: text("address").notNull(),
    landmark: text("landmark").notNull().default(""),
    meal: text("meal", { enum: ["breakfast", "lunch", "snacks", "dinner"] }).notNull(),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method", { enum: ["cash", "upi"] }).notNull(),
    status: text("status", { enum: ["new", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"] }).notNull().default("new"),
    notificationStatus: text("notification_status", { enum: ["queued", "sent", "needs_setup", "failed"] }).notNull().default("queued"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("orders_status_created_idx").on(table.status, table.createdAt), index("orders_user_idx").on(table.userId, table.createdAt)],
);

export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    menuItemId: text("menu_item_id").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id").notNull(),
    channel: text("channel", { enum: ["dashboard", "whatsapp"] }).notNull(),
    status: text("status", { enum: ["queued", "sent", "needs_setup", "failed"] }).notNull(),
    detail: text("detail").notNull().default(""),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("notification_order_idx").on(table.orderId, table.createdAt)],
);
