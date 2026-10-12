CREATE TABLE `members` (
	`walk_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text NOT NULL,
	`lat` real,
	`lng` real,
	`expires` integer,
	`summary` text,
	PRIMARY KEY(`walk_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`route_id` text NOT NULL,
	`kind` text NOT NULL,
	`note` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shared_walks` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`title` text NOT NULL,
	`route` text NOT NULL,
	`meeting` text NOT NULL,
	`time` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
