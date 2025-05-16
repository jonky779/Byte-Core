import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  apiKey: text("api_key"),
  email: text("email"),
});

// Create the insert schema for creating new users
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  apiKey: true,
});

// Define our types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect & {
  apiKey?: string | null;
};
