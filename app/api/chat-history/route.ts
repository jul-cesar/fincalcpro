import { desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { chatSession } from "@/db/schema"
import { ensureChatHistoryTables } from "@/lib/chat-history"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureChatHistoryTables()

  const { searchParams } = new URL(request.url)
  const limitParam = Number(searchParams.get("limit") ?? "30")
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(80, Math.floor(limitParam))) : 30

  const records = await db
    .select({
      id: chatSession.id,
      title: chatSession.title,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
    })
    .from(chatSession)
    .where(eq(chatSession.userId, session.user.id))
    .orderBy(desc(chatSession.updatedAt))
    .limit(limit)

  return NextResponse.json({ records })
}
