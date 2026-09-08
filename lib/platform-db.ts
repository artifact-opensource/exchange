import { drizzle } from "drizzle-orm/node-postgres";
import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { Pool } from "pg";

export const memberships = pgTable("artifact_memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique(),
  tier: text("tier").notNull().default("free"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("artifact_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalId: text("external_id").notNull().unique(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url"),
  summary: text("summary"),
  content: text("content"),
  accessTier: text("access_tier").notNull().default("free"),
  status: text("status").notNull().default("published"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const kanbanCards = pgTable("artifact_kanban_cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  board: text("board").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  columnKey: text("column_key").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  owner: text("owner"),
  accessTier: text("access_tier").notNull().default("backer"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("artifact_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportType: text("report_type").notNull(),
  title: text("title").notNull(),
  period: text("period"),
  accessTier: text("access_tier").notNull().default("backer"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditEvents = pgTable("artifact_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
export const platformDb = pool ? drizzle(pool, { schema: { memberships, documents, kanbanCards, reports, auditEvents } }) : null;

export function membershipTier(value: unknown) {
  const tier = String(value || "free").toLowerCase();
  return ["free", "backer", "pillar", "operator"].includes(tier) ? tier : "free";
}

export function tierRank(tier: string) {
  return { free: 0, backer: 1, pillar: 2, operator: 3 }[membershipTier(tier)] ?? 0;
}

export function canAccess(userTier: string, requiredTier: string) {
  return tierRank(userTier) >= tierRank(requiredTier);
}

export function requirePlatformDb() {
  if (!platformDb) throw new Error("DATABASE_URL is not configured");
  return platformDb;
}

export type MembershipTier = "free" | "backer" | "pillar" | "operator";
export type PlatformDb = typeof platformDb;
