import { z } from "zod"

export const exerciseModules = [
  "simple",
  "compound",
  "rates",
  "annuity",
  "amortization",
  "project",
  "cashflow",
] as const

export const simpleExerciseTypes = [
  "interest",
  "final_amount",
  "principal",
  "rate",
  "time",
] as const

export const exerciseModuleSchema = z.enum(exerciseModules)

export const exerciseHistoryInputSchema = z.object({
  principal: z.string(),
  rate: z.string(),
  periods: z.string(),
})

export const createExerciseSchema = z.object({
  module: exerciseModuleSchema,
  exerciseType: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(120),
  input: z.record(z.string(), z.string()),
})

export type ExerciseModule = z.infer<typeof exerciseModuleSchema>
export type SimpleExerciseType = (typeof simpleExerciseTypes)[number]
