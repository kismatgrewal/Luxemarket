import { z } from "zod";

/**
 * Validate environment variables at boot. Fail fast with a readable error
 * instead of surfacing `undefined` deep inside a request handler.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = serverSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV === "production") {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = (parsed.success ? parsed.data : (process.env as unknown)) as z.infer<
  typeof serverSchema
>;
