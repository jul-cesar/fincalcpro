import { and, eq } from "drizzle-orm"
import { NextResponse } from "next/server"

import { db } from "@/db"
import { exerciseHistory } from "@/db/schema"
import { auth } from "@/lib/auth"

type Params = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, context: Params) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  const record = await db
    .select({
      id: exerciseHistory.id,
      module: exerciseHistory.module,
      exerciseType: exerciseHistory.exerciseType,
      title: exerciseHistory.title,
      input: exerciseHistory.input,
      createdAt: exerciseHistory.createdAt,
      updatedAt: exerciseHistory.updatedAt,
    })
    .from(exerciseHistory)
    .where(and(eq(exerciseHistory.id, id), eq(exerciseHistory.userId, session.user.id)))
    .limit(1)

  if (record.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ record: record[0] })
}
