import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key"),
  email: text("email"),
  lastLogin: text("last_login"),
  registeredAt: text("registered_at"),
  role: text("role").default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  apiKey: true,
});

// Define schemas for crawler-related data
export const crawlerConfig = pgTable("crawler_config", {
  id: serial("id").primaryKey(),
  enabled: boolean("enabled").default(false),
  crawlIntervalMinutes: integer("crawl_interval_minutes").default(60),
  playerIdStart: integer("player_id_start").default(1),
  playerIdEnd: integer("player_id_end").default(3000000),
  requestDelayMs: integer("request_delay_ms").default(500),
  batchSize: integer("batch_size").default(100),
  maxConcurrentRequests: integer("max_concurrent_requests").default(5),
  lastCrawlPosition: integer("last_crawl_position"),
  lastCrawlTime: text("last_crawl_time"),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  theme: text("theme").default("dark"),
  defaultRefreshRate: integer("default_refresh_rate").default(60),
  autoSync: boolean("auto_sync").default(true),
  notifications: jsonb("notifications").notNull(),
  display: jsonb("display").notNull(),
});

export const tornItems = pgTable("torn_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  category: text("category"),
  marketValue: integer("market_value"),
  circulation: integer("circulation"),
  description: text("description"),
});

export const playerData = pgTable("player_data", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().unique(),
  name: text("name").notNull(),
  level: integer("level"),
  status: text("status"),
  lastAction: text("last_action"),
  factionId: integer("faction_id"),
  factionName: text("faction_name"),
  factionPosition: text("faction_position"),
  companyId: integer("company_id"),
  companyName: text("company_name"),
  companyPosition: text("company_position"),
  companyType: text("company_type"),
  stats: jsonb("stats"),
  workStats: jsonb("work_stats"),
  lastUpdated: text("last_updated"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
