CREATE TABLE `service_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`last` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `shared_walks` ADD `ended` integer DEFAULT 0 NOT NULL;