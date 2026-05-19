import { sql } from "drizzle-orm"

import { db } from "@/db"

let ensured = false

export async function ensureChatHistoryTables() {
  if (ensured) return

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_session" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "title" text NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "chat_session_user_id_idx"
      ON "chat_session" ("user_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "chat_session_updated_at_idx"
      ON "chat_session" ("updated_at");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "chat_message" (
      "id" text PRIMARY KEY,
      "chat_id" text NOT NULL REFERENCES "chat_session"("id") ON DELETE CASCADE,
      "role" text NOT NULL,
      "content" text NOT NULL,
      "meta" text,
      "sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "suggestion" jsonb,
      "checks" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "chat_message_chat_id_idx"
      ON "chat_message" ("chat_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "chat_message_created_at_idx"
      ON "chat_message" ("created_at");
  `)

  ensured = true
}

export function buildChatTitle(message: string) {
  const normalized = message.replace(/\s+/g, " ").trim()
  if (!normalized) return "Nueva conversacion"
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized
}
