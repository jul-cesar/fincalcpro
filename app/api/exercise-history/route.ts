import { and, desc, eq } from "drizzle-orm"
import { NextResponse } from "next/server"
import { createHash } from "node:crypto"

import { db } from "@/db"
import { exerciseHistory } from "@/db/schema"
import { createExerciseSchema, exerciseModuleSchema } from "@/lib/exercise-history"
import { auth } from "@/lib/auth"

async function getSession(headers: Headers) {
  return auth.api.getSession({ headers })
}

export async function GET(request: Request) {
  const session = await getSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const moduleParam = searchParams.get("module")
  const moduleParsed = exerciseModuleSchema.safeParse(moduleParam)

  if (!moduleParsed.success) {
    return NextResponse.json({ error: "Invalid module" }, { status: 400 })
  }

  const records = await db
    .select({
      id: exerciseHistory.id,
      module: exerciseHistory.module,
      exerciseType: exerciseHistory.exerciseType,
      title: exerciseHistory.title,
      input: exerciseHistory.input,
      inputHash: exerciseHistory.inputHash,
      createdAt: exerciseHistory.createdAt,
      updatedAt: exerciseHistory.updatedAt,
    })
    .from(exerciseHistory)
    .where(
      and(
        eq(exerciseHistory.userId, session.user.id),
        eq(exerciseHistory.module, moduleParsed.data)
      )
    )
    .orderBy(desc(exerciseHistory.updatedAt))
    .limit(50)

  return NextResponse.json({ records })
}

export async function POST(request: Request) {
  const session = await getSession(request.headers)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await request.json().catch(() => null)
  const parsed = createExerciseSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const record = {
    inputHash: createHash("sha256")
      .update(JSON.stringify(parsed.data.input))
      .digest("hex"),
    id: crypto.randomUUID(),
    userId: session.user.id,
    module: parsed.data.module,
    exerciseType: parsed.data.exerciseType,
    title: parsed.data.title,
    input: parsed.data.input,
  }

  const duplicate = await db
    .select({ id: exerciseHistory.id })
    .from(exerciseHistory)
    .where(
      and(
        eq(exerciseHistory.userId, record.userId),
        eq(exerciseHistory.module, record.module),
        eq(exerciseHistory.exerciseType, record.exerciseType),
        eq(exerciseHistory.inputHash, record.inputHash),
      )
    )
    .limit(1)

  if (duplicate.length > 0) {
    return NextResponse.json({ error: "Duplicate exercise" }, { status: 409 })
  }

  await db.insert(exerciseHistory).values(record)

  return NextResponse.json({ record }, { status: 201 })
}
