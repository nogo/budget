import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real, index, sqliteView } from "drizzle-orm/sqlite-core";

// Enums
export const transactionTypeEnum = ["expense", "income"] as const;
export type TransactionType = typeof transactionTypeEnum[number];

// Tables
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  hasNotes: integer("has_notes", { mode: "boolean" }).notNull().default(false),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    amount: real("amount").notNull(),
    type: text("type", { enum: transactionTypeEnum }).notNull().default("expense"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    date: integer("date").notNull(),
    note: text("note").notNull().default(""),
  },
  (table) => [
    index("transactions_type_idx").on(table.type),
    index("transactions_date_idx").on(table.date),
  ]
);

export const templates = sqliteTable(
  "templates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    amount: real("amount").notNull(),
    type: text("type", { enum: transactionTypeEnum }).notNull().default("expense"),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    day: integer("day").notNull(),
    note: text("note").notNull().default(""),
  },
  (table) => [index("templates_type_idx").on(table.type)]
);

// Better-auth tables
export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  displayUsername: text("displayUsername").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = sqliteTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verifications = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// Views - Define with explicit column schema
export const reviewYears = sqliteView("review_years", {
  year: integer("year"),
  income: real("income"),
  expense: real("expense"),
  total: real("total"),
}).as(sql`
SELECT
  CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM transactions
GROUP BY year
ORDER BY year DESC
`);

export const reviewMonths = sqliteView("review_months", {
  year: integer("year"),
  month: integer("month"),
  income: real("income"),
  expense: real("expense"),
  total: real("total"),
}).as(sql`
SELECT
  CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
  CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM transactions
GROUP BY year, month
ORDER BY year DESC, month DESC
`);

export const reviewCategoryMonths = sqliteView("review_category_months", {
  year: integer("year"),
  month: integer("month"),
  categoryName: text("category_name"),
  income: real("income"),
  expense: real("expense"),
  total: real("total"),
}).as(sql`
SELECT
  CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
  CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
  categories.name AS category_name,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM transactions
LEFT JOIN categories ON transactions.category_id = categories.id
GROUP BY year, month, category_id
ORDER BY year DESC, month DESC
`);

export const reviewYearsWithCategories = sqliteView("review_years_with_categories", {
  year: integer("year"),
  categoryId: integer("category_id"),
  categoryName: text("category_name"),
  income: real("income"),
  expense: real("expense"),
  total: real("total"),
}).as(sql`
SELECT
  CAST(strftime('%Y', t.date, 'unixepoch') as DECIMAL) AS year,
  COALESCE(t.category_id, 0) AS category_id,
  c.name as category_name,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY year, COALESCE(t.category_id, 0), c.name
ORDER BY year DESC, c.name
`);

export const reviewMonthsWithCategories = sqliteView("review_months_with_categories", {
  year: integer("year"),
  month: integer("month"),
  categoryId: integer("category_id"),
  categoryName: text("category_name"),
  income: real("income"),
  expense: real("expense"),
  total: real("total"),
}).as(sql`
SELECT
  CAST(strftime('%Y', t.date, 'unixepoch') as DECIMAL) AS year,
  CAST(strftime('%m', t.date, 'unixepoch') as DECIMAL) AS month,
  COALESCE(t.category_id, 0) AS category_id,
  c.name as category_name,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) AS income,
  SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS expense,
  SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) AS total
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
GROUP BY year, month, COALESCE(t.category_id, 0), c.name
ORDER BY year DESC, month DESC, c.name
`);

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
