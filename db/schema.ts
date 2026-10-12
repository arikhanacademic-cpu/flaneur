import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
export const userState = sqliteTable('user_state', {userId:text('user_id').primaryKey(), value:text('value').notNull()});
export const sharedWalks = sqliteTable('shared_walks',{id:text('id').primaryKey(),host:text('host').notNull(),title:text('title').notNull(),route:text('route').notNull(),meeting:text('meeting').notNull(),time:text('time').notNull(),created:integer('created').notNull(),ended:integer('ended').notNull().default(0)});
export const members=sqliteTable('members',{walkId:text('walk_id').notNull(),userId:text('user_id').notNull(),name:text('name').notNull(),status:text('status').notNull(),lat:real('lat'),lng:real('lng'),expires:integer('expires'),summary:text('summary')},t=>[primaryKey({columns:[t.walkId,t.userId]})]);
export const reports=sqliteTable('reports',{id:text('id').primaryKey(),userId:text('user_id').notNull(),routeId:text('route_id').notNull(),kind:text('kind').notNull(),note:text('note').notNull(),created:integer('created').notNull()});

export const requests=sqliteTable('service_requests',{id:text('id').primaryKey(),last:integer('last').notNull()});

export const serviceCache=sqliteTable('service_cache',{id:text('id').primaryKey(),value:text('value').notNull(),expires:integer('expires').notNull()});
