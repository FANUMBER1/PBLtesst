import { ZodSchema, ZodError } from "zod";

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const data = schema.parse(body);
    return { success: true, data };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const messages = err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
      return { success: false, error: messages };
    }
    return { success: false, error: "Validation failed" };
  }
}
