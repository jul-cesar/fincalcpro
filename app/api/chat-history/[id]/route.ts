import { and, asc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { chatMessage, chatSession } from "@/db/schema"
import { ensureChatHistoryTables } from "@/lib/chat-history"
import { auth } from "@/lib/auth"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureChatHistoryTables()

  const { id } = await context.params
  const records = await db
    .select({
      id: chatSession.id,
      title: chatSession.title,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
    })
    .from(chatSession)
    .where(and(eq(chatSession.id, id), eq(chatSession.userId, session.user.id)))
    .limit(1)

  if (records.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const messages = await db
    .select({
      id: chatMessage.id,
      role: chatMessage.role,
      content: chatMessage.content,
      meta: chatMessage.meta,
      sections: chatMessage.sections,
      suggestion: chatMessage.suggestion,
      checks: chatMessage.checks,
      createdAt: chatMessage.createdAt,
    })
    .from(chatMessage)
    .where(eq(chatMessage.chatId, id))
    .orderBy(asc(chatMessage.createdAt))

  return NextResponse.json({ record: records[0], messages })
}

export async function DELETE(request: Request, context: Params) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureChatHistoryTables()

  const { id } = await context.params
  await db
    .delete(chatSession)
    .where(and(eq(chatSession.id, id), eq(chatSession.userId, session.user.id)))

  return NextResponse.json({ ok: true })
}
