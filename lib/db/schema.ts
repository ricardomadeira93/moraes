import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "walk_in",
  "canceled",
  "no_show",
  "completed"
]);

export const appointmentSourceEnum = pgEnum("appointment_source", ["online", "walk_in"]);

export const userRoleEnum = pgEnum("user_role", ["admin"]);

export const shops = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Sao_Paulo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 180 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("admin")
  },
  (t) => ({
    uniquePerShop: uniqueIndex("users_shop_email_uq").on(t.shopId, t.email),
    idPerShop: unique("users_shop_id_uq").on(t.shopId, t.id)
  })
);

export const barbers = pgTable(
  "barbers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").notNull().default(true)
  },
  (t) => ({
    byShop: index("barbers_shop_idx").on(t.shopId),
    byShopActive: index("barbers_shop_active_idx").on(t.shopId, t.active),
    idPerShop: unique("barbers_shop_id_uq").on(t.shopId, t.id)
  })
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    durationSlots: integer("duration_slots").notNull().default(1),
    priceCents: integer("price_cents").notNull().default(0),
    active: boolean("active").notNull().default(true)
  },
  (t) => ({
    byShop: index("services_shop_idx").on(t.shopId),
    byShopActive: index("services_shop_active_idx").on(t.shopId, t.active),
    positiveDuration: check("services_duration_slots_ck", sql`"duration_slots" > 0`),
    nonNegativePrice: check("services_price_cents_ck", sql`"price_cents" >= 0`),
    idPerShop: unique("services_shop_id_uq").on(t.shopId, t.id)
  })
);

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull()
  },
  (t) => ({
    uniquePhonePerShop: uniqueIndex("customers_shop_phone_uq").on(t.shopId, t.phone),
    byShopName: index("customers_shop_name_idx").on(t.shopId, t.name),
    idPerShop: unique("customers_shop_id_uq").on(t.shopId, t.id)
  })
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    barberId: uuid("barber_id").notNull(),
    serviceId: uuid("service_id").notNull(),
    customerId: uuid("customer_id").notNull(),
    source: appointmentSourceEnum("source").notNull().default("online"),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    dateRange: text("date_range").generatedAlwaysAs(() => sql`tstzrange("starts_at", "ends_at", '[)')`)
  },
  (t) => ({
    byShopStart: index("appointments_shop_start_idx").on(t.shopId, t.startsAt),
    byBarberTime: index("appointments_barber_time_idx").on(t.barberId, t.startsAt, t.endsAt),
    byShopBarberStatusStart: index("appointments_shop_barber_status_start_idx").on(
      t.shopId,
      t.barberId,
      t.status,
      t.startsAt
    ),
    validRange: check("appointments_valid_range_ck", sql`"starts_at" < "ends_at"`),
    barberFkInShop: foreignKey({
      columns: [t.shopId, t.barberId],
      foreignColumns: [barbers.shopId, barbers.id],
      name: "appointments_shop_barber_fk"
    }).onDelete("cascade"),
    serviceFkInShop: foreignKey({
      columns: [t.shopId, t.serviceId],
      foreignColumns: [services.shopId, services.id],
      name: "appointments_shop_service_fk"
    }).onDelete("restrict"),
    customerFkInShop: foreignKey({
      columns: [t.shopId, t.customerId],
      foreignColumns: [customers.shopId, customers.id],
      name: "appointments_shop_customer_fk"
    }).onDelete("restrict")
  })
);

export const availabilityRules = pgTable(
  "availability_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    barberId: uuid("barber_id"),
    weekday: integer("weekday").notNull(),
    startMinute: integer("start_minute").notNull(),
    endMinute: integer("end_minute").notNull()
  },
  (t) => ({
    byShopBarberWeekday: index("availability_shop_barber_weekday_idx").on(t.shopId, t.barberId, t.weekday),
    byShopWeekday: index("availability_shop_weekday_idx").on(t.shopId, t.weekday),
    validWeekday: check("availability_weekday_ck", sql`"weekday" between 0 and 6`),
    validMinuteRange: check(
      "availability_minute_range_ck",
      sql`"start_minute" >= 0 and "end_minute" <= 1440 and "start_minute" < "end_minute"`
    ),
    barberFkInShop: foreignKey({
      columns: [t.shopId, t.barberId],
      foreignColumns: [barbers.shopId, barbers.id],
      name: "availability_shop_barber_fk"
    }).onDelete("cascade")
  })
);

export const timeBlocks = pgTable(
  "time_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    barberId: uuid("barber_id"),
    reason: varchar("reason", { length: 120 }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull()
  },
  (t) => ({
    byShopTime: index("time_blocks_shop_time_idx").on(t.shopId, t.startsAt, t.endsAt),
    byShopBarberTime: index("time_blocks_shop_barber_time_idx").on(t.shopId, t.barberId, t.startsAt),
    validRange: check("time_blocks_valid_range_ck", sql`"starts_at" < "ends_at"`),
    barberFkInShop: foreignKey({
      columns: [t.shopId, t.barberId],
      foreignColumns: [barbers.shopId, barbers.id],
      name: "time_blocks_shop_barber_fk"
    }).onDelete("cascade")
  })
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id"),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    endpointUnique: uniqueIndex("push_endpoint_uq").on(t.endpoint),
    byShopUser: index("push_shop_user_idx").on(t.shopId, t.userId),
    userFkInShop: foreignKey({
      columns: [t.shopId, t.userId],
      foreignColumns: [users.shopId, users.id],
      name: "push_subscriptions_shop_user_fk"
    }).onDelete("cascade")
  })
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    notifyNewBooking: boolean("notify_new_booking").notNull().default(true),
    notifyCancellation: boolean("notify_cancellation").notNull().default(true),
    notifyReminder: boolean("notify_reminder").notNull().default(true),
    channels: jsonb("channels").$type<string[]>().notNull().default(["push"])
  },
  (t) => ({
    onePerUserPerShop: uniqueIndex("notification_preferences_shop_user_uq").on(t.shopId, t.userId),
    userFkInShop: foreignKey({
      columns: [t.shopId, t.userId],
      foreignColumns: [users.shopId, users.id],
      name: "notification_preferences_shop_user_fk"
    }).onDelete("cascade")
  })
);

export const shopRelations = relations(shops, ({ many }) => ({
  barbers: many(barbers),
  services: many(services),
  appointments: many(appointments)
}));

export const pushNotificationEvents = pgTable(
  "push_notification_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: uuid("shop_id").notNull().references(() => shops.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").notNull().references(() => pushSubscriptions.id, { onDelete: "cascade" }),
    eventKey: varchar("event_key", { length: 200 }).notNull(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    eventUnique: uniqueIndex("push_events_shop_sub_event_uq").on(t.shopId, t.subscriptionId, t.eventKey),
    byShopDeliveredAt: index("push_events_shop_delivered_idx").on(t.shopId, t.deliveredAt)
  })
);
