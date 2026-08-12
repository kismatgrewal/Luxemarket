import "server-only";

import OpenAI from "openai";
import { z } from "zod";

import { env } from "@/lib/env";
import type { GenerateDescriptionInput, GenerateDescriptionResult } from "@/types";

/**
 * OpenAI copywriter for premium product listings.
 *
 * Vendors draft a title + a handful of attributes; the model returns editorial
 * body copy, an SEO title and scannable bullets. The output is constrained to
 * strict JSON and validated with Zod so a malformed completion fails loudly
 * rather than corrupting a product record.
 */

/** Thrown when the OpenAI integration is not configured or the API rejects us. */
export class ProductCopyError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "invalid_response" | "api_error",
  ) {
    super(message);
    this.name = "ProductCopyError";
  }
}

// Cache the client across warm invocations, but construct it lazily so that a
// missing key surfaces as a typed error at call time rather than at import.
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new ProductCopyError(
      "OPENAI_API_KEY is not set — cannot generate product copy.",
      "not_configured",
    );
  }
  if (!client) client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `You are the senior copywriter for LuxeMarket, a curated marketplace for premium goods.
Write like a boutique catalog: confident, sensory, and specific — never hyperbolic, never salesy.
Rules:
- Lead with the material, craft, and the feeling of ownership; avoid clichés ("game-changer", "must-have", "top-notch").
- Use only facts implied by the provided title and attributes. Do not invent certifications, awards, or measurements.
- No emojis, no ALL-CAPS, no exclamation marks.
- "description": 2–3 short paragraphs (about 60–110 words total).
- "seoTitle": <= 60 characters, includes the product type, Title Case.
- "bullets": 3–5 concise selling points, 3–9 words each, no trailing punctuation.
Return ONLY a JSON object with keys: description (string), seoTitle (string), bullets (string[]).`;

/** Model contract for the JSON we ask OpenAI to return. */
const completionSchema = z.object({
  description: z.string().min(1),
  seoTitle: z.string().min(1).max(70),
  bullets: z.array(z.string().min(1)).min(2).max(6),
});

const TONE_GUIDANCE: Record<NonNullable<GenerateDescriptionInput["tone"]>, string> = {
  premium: "Tone: understated luxury — restrained, precise, aspirational.",
  playful: "Tone: warm and witty, still tasteful; a light, human voice.",
  minimal: "Tone: spare and modern; short sentences, plenty of negative space.",
  technical: "Tone: precise and spec-forward for a discerning, informed buyer.",
  warm: "Tone: inviting and personal, evoking everyday ritual and comfort.",
};

function renderAttributes(attributes: GenerateDescriptionInput["attributes"]): string {
  if (!attributes) return "(none provided)";
  const lines = Object.entries(attributes)
    .filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== "")
    .map(([k, v]) => `- ${k}: ${v}`);
  return lines.length ? lines.join("\n") : "(none provided)";
}

export async function generateProductDescription(
  input: GenerateDescriptionInput,
): Promise<GenerateDescriptionResult> {
  const { title, category, attributes, tone = "premium" } = input;
  const openai = getClient();

  const userPrompt = [
    `Product title: ${title}`,
    `Category: ${category ?? "unspecified"}`,
    `Attributes:\n${renderAttributes(attributes)}`,
    TONE_GUIDANCE[tone],
  ].join("\n\n");

  let raw: string | null | undefined;
  try {
    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      // Slight creativity, but bounded — this is catalog copy, not fiction.
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });
    raw = completion.choices[0]?.message?.content;
  } catch (err) {
    throw new ProductCopyError(
      `OpenAI request failed: ${err instanceof Error ? err.message : "unknown error"}`,
      "api_error",
    );
  }

  if (!raw) {
    throw new ProductCopyError("OpenAI returned an empty completion.", "invalid_response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProductCopyError("OpenAI returned non-JSON content.", "invalid_response");
  }

  const result = completionSchema.safeParse(parsed);
  if (!result.success) {
    throw new ProductCopyError(
      `OpenAI response failed validation: ${result.error.issues.map((i) => i.message).join("; ")}`,
      "invalid_response",
    );
  }

  return {
    description: result.data.description.trim(),
    seoTitle: result.data.seoTitle.trim(),
    bullets: result.data.bullets.map((b) => b.trim()),
  };
}
