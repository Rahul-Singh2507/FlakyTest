import { z } from "zod";

const idHint = z.string().optional();

const withinText = z.string().min(1).optional();

export const targetSchema = z.discriminatedUnion("strategy", [
  z.object({ strategy: z.literal("role"), role: z.string().min(1), name: z.string().min(1), idHint, withinText }),
  z.object({ strategy: z.literal("label"), value: z.string().min(1), idHint, withinText }),
  z.object({ strategy: z.literal("text"), value: z.string().min(1), idHint, withinText }),
  z.object({ strategy: z.literal("css"), value: z.string().min(1) }),
]);

export const stepSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("goto"), path: z.string().startsWith("/") }),
  z.object({ action: z.literal("fill"), target: targetSchema, value: z.string() }),
  z.object({ action: z.literal("click"), target: targetSchema }),
  z.object({ action: z.literal("expectVisible"), target: targetSchema }),
  z.object({ action: z.literal("expectText"), value: z.string().min(1) }),
]);

export const generatedTestSchema = z
  .object({
    criterionIndex: z.number().int().min(0),
    name: z.string().min(1).max(120),
    steps: z.array(stepSchema).min(1).max(20),
  })
  .refine((test) => test.steps.every((step) => step.target?.strategy !== "css"), {
    message: "Generated targets must use role, label or text, not CSS",
  })
  .refine((test) => test.steps[0]?.action === "goto", { message: "Each test must start with a goto step" })
  .refine((test) => test.steps.some((step) => step.action.startsWith("expect")), {
    message: "Each test must contain at least one expectVisible or expectText assertion",
  });

export const generatedSuiteSchema = (criteriaCount) =>
  z
    .object({ tests: z.array(generatedTestSchema) })
    .refine(
      (suite) =>
        suite.tests.length === criteriaCount &&
        new Set(suite.tests.map((test) => test.criterionIndex)).size === criteriaCount &&
        suite.tests.every((test) => test.criterionIndex < criteriaCount),
      { message: `Return exactly one test for each criterionIndex from 0 to ${criteriaCount - 1}` }
    );

export const healSuggestionSchema = z.object({
  candidateIndex: z.number().int().min(-1),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});
