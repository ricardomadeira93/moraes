import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const shops = pgTable("shops", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Sao_Paulo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  email: varchar("email", { length: 180 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 40 }).notNull().default("admin")
}, (t) => ({
  uniquePerShop: uniqueIndex("users_shop_email_uq").on(t.shopId, t.email)
}));

export const barbers = pgTable("barbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  name: varchar("name", { length: 120 }).notNull(),
  active: boolean("active").notNull().default(true)
}, (t) => ({
  byShop: index("barbers_shop_idx").on(t.shopId)
}));

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  name: varchar("name", { length: 120 }).notNull(),
  durationSlots: integer("duration_slots").notNull().default(1),
  priceCents: integer("price_cents").notNull().default(0),
  active: boolean("active").notNull().default(true)
}, (t) => ({
  byShop: index("services_shop_idx").on(t.shopId)
}));

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull()
}, (t) => ({
  uniquePhonePerShop: uniqueIndex("customers_shop_phone_uq").on(t.shopId, t.phone)
}));

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  barberId: uuid("barber_id").notNull().references(() => barbers.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  source: varchar("source", { length: 20 }).notNull().default("online"),
  status: varchar("status", { length: 20 }).notNull().default("scheduled"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  dateRange: text("date_range").generatedAlwaysAs(() => sql`tsrange("starts_at", "ends_at", '[)')`)
}, (t) => ({
  byShopStart: index("appointments_shop_start_idx").on(t.shopId, t.startsAt),
  byBarberStart: index("appointments_barber_start_idx").on(t.barberId, t.startsAt),
  noOverlap: uniqueIndex("appointments_no_overlap_idx").on(t.barberId, t.startsAt, t.endsAt)
}));

export const availabilityRules = pgTable("availability_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  barberId: uuid("barber_id").references(() => barbers.id),
  weekday: integer("weekday").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull()
});

export const timeBlocks = pgTable("time_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  barberId: uuid("barber_id").references(() => barbers.id),
  reason: varchar("reason", { length: 120 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull()
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  userId: uuid("user_id").references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (t) => ({
  endpointUnique: uniqueIndex("push_endpoint_uq").on(t.endpoint)
}));

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  shopId: uuid("shop_id").notNull().references(() => shops.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  notifyNewBooking: boolean("notify_new_booking").notNull().default(true),
  notifyCancellation: boolean("notify_cancellation").notNull().default(true),
  notifyReminder: boolean("notify_reminder").notNull().default(true),
  channels: jsonb("channels").$type<string[]>().notNull().default(["push"]) 
});

export const shopRelations = relations(shops, ({ many }) => ({
  barbers: many(barbers),
  services: many(services),
  appointments: many(appointments)
}));
