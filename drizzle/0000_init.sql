CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`has_notes` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`category_id` integer NOT NULL,
	`day` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `templates_type_idx` ON `templates` (`type`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`amount` real NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`category_id` integer NOT NULL,
	`date` integer NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_type_idx` ON `transactions` (`type`);--> statement-breakpoint
CREATE INDEX `transactions_date_idx` ON `transactions` (`date`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text NOT NULL,
	`displayUsername` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE VIEW `review_category_months` AS 
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
;--> statement-breakpoint
CREATE VIEW `review_months` AS 
SELECT
  CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
  CAST(strftime('%m', date, 'unixepoch') as DECIMAL) AS month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM transactions
GROUP BY year, month
ORDER BY year DESC, month DESC
;--> statement-breakpoint
CREATE VIEW `review_months_with_categories` AS 
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
;--> statement-breakpoint
CREATE VIEW `review_years` AS 
SELECT
  CAST(strftime('%Y', date, 'unixepoch') as DECIMAL) AS year,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total
FROM transactions
GROUP BY year
ORDER BY year DESC
;--> statement-breakpoint
CREATE VIEW `review_years_with_categories` AS 
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
;