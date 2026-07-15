CREATE TABLE `chef_profiles` (
	`id` integer PRIMARY KEY NOT NULL,
	`kitchen_name` text NOT NULL,
	`chef_name` text NOT NULL,
	`locality` text NOT NULL,
	`whatsapp_number` text NOT NULL,
	`upi_id` text NOT NULL,
	`bio` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_slots` (
	`key` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order_open_minute` integer NOT NULL,
	`cutoff_minute` integer NOT NULL,
	`delivery_label` text NOT NULL,
	`cutoff_label` text NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price` integer NOT NULL,
	`image` text NOT NULL,
	`meal` text NOT NULL,
	`tag` text NOT NULL,
	`portions` integer NOT NULL,
	`available` integer DEFAULT true NOT NULL,
	`vegetarian` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `menu_meal_available_idx` ON `menu_items` (`meal`,`available`,`sort_order`);--> statement-breakpoint
CREATE TABLE `notification_events` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_order_idx` ON `notification_events` (`order_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`menu_item_id` text NOT NULL,
	`name` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`customer_name` text NOT NULL,
	`address` text NOT NULL,
	`landmark` text DEFAULT '' NOT NULL,
	`meal` text NOT NULL,
	`total` integer NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`notification_status` text DEFAULT 'queued' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_status_created_idx` ON `orders` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `otp_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`purpose` text NOT NULL,
	`provider` text NOT NULL,
	`provider_ref` text,
	`code_hash` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `otp_phone_created_idx` ON `otp_challenges` (`phone`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`role` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`phone` text NOT NULL,
	`role` text DEFAULT 'consumer' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);