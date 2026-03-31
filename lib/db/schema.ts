export * from "./auth-schema"

import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const test = pgTable(
  "test",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    test: text("test"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);