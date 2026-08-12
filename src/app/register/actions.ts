"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type RegisterResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters").max(128),
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

/**
 * Creates a local CUSTOMER account (scrypt-hashed password, verified email) and
 * redirects to the sign-in page so the new user logs in and continues to the
 * page they originally tried to visit.
 */
export async function registerAction(formData: FormData): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  const passwordHash = await hashPassword(password);
  try {
    await prisma.user.create({
      data: {
        name,
        email,
        role: "CUSTOMER",
        passwordHash,
        emailVerified: new Date(),
        cart: { create: {} },
      },
    });
  } catch {
    return { ok: false, error: "Couldn't create your account. Please try again." };
  }

  const rawCallback = formData.get("callbackUrl");
  const callbackUrl =
    typeof rawCallback === "string" && rawCallback.startsWith("/") ? rawCallback : "/";
  const query = new URLSearchParams({ registered: "1" });
  if (callbackUrl !== "/") query.set("callbackUrl", callbackUrl);
  redirect(`/login?${query.toString()}`);
}