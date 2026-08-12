import { NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { generateProductDescription, ProductCopyError } from "@/lib/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/products/describe
 *
 * Generates marketing copy for a product with OpenAI. Guarded by `product:write`
 * (vendors and admins). Products saved with the returned text set
 * `Product.aiGenerated = true`. See docs/API.md for the full contract.
 */

const describeSchema = z.object({
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().max(80).optional(),
  attributes: z.array(z.string().trim().max(120)).max(20).optional(),
  tone: z.enum(["premium", "playful", "minimal", "technical", "warm"]).optional(),
});

const TONE_LABEL: Record<string, string> = {
  premium: "premium",
  playful: "playful",
  minimal: "minimal",
  technical: "technical",
  warm: "warm",
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  try {
    assertCan(session.user.role, "product:write");
  } catch {
    return NextResponse.json(
      { error: "You do not have permission to do that." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = describeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { title, category, attributes, tone } = parsed.data;

  // The docs contract accepts a plain string[] for attributes; the OpenAI
  // client takes a key/value record, so expand positional entries.
  const input: {
    title: string;
    category?: string;
    tone?: string;
    attributes?: Record<string, string>;
  } = { title };
  if (category) input.category = category;
  if (tone) input.tone = TONE_LABEL[tone] ?? tone;
  if (attributes && attributes.length > 0) {
    input.attributes = Object.fromEntries(
      attributes.map((attr, i) => [`attribute_${i + 1}`, attr]),
    );
  }

  try {
    const result = await generateProductDescription(
      input as Parameters<typeof generateProductDescription>[0],
    );
    return NextResponse.json({
      description: result.description,
      seoTitle: result.seoTitle,
      bullets: result.bullets,
      model: "gpt-4o-mini",
      aiGenerated: true,
    });
  } catch (err) {
    if (err instanceof ProductCopyError) {
      return NextResponse.json(
        { error: "Copy generation failed.", code: err.code },
        { status: err.code === "not_configured" ? 503 : 502 },
      );
    }
    return NextResponse.json({ error: "Copy generation failed." }, { status: 502 });
  }
}
