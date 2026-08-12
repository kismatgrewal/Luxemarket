import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import type { Role } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { getServerSession, type DefaultSession, type NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
//
// We derive password hashes with Node's built-in scrypt rather than pulling in
// bcrypt. scrypt is memory-hard, ships with the runtime (no extra dependency),
// and stored as `scrypt$<salt>$<hash>` so the parameters travel with the value.

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCHEME = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${SCHEME}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== SCHEME || !salt || !hash) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  // timingSafeEqual throws on length mismatch, so bail out first — this also
  // keeps the comparison constant-time for equal-length inputs.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

// ---------------------------------------------------------------------------
// NextAuth configuration
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  // The adapter persists NextAuth's Account/Session/User rows; the version from
  // `@auth/prisma-adapter` targets Auth.js core, so we widen it to the v4 type.
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: env.NEXTAUTH_SECRET,
  // Credentials sign-in requires JWT sessions — the token also carries `role`
  // so RBAC checks in middleware and layouts never hit the database.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        // Reject unknown users and OAuth-only accounts (no local password) the
        // same way, without leaking which case occurred.
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on initial sign-in; copy identity + role onto the
      // token so later requests read them without another query.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/** The current authenticated user, or `null` when signed out. */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Require a signed-in user. Guests get pushed to registration (with a callback
 * URL back to where they were headed), per the storefront's public-page model.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/register");
  return user;
}

/**
 * Require a specific role. Admins are superusers and satisfy every gate; any
 * other mismatch sends the (authenticated) user back to the storefront.
 */
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role && user.role !== "ADMIN") redirect("/");
  return user;
}

// ---------------------------------------------------------------------------
// Type augmentation — teach NextAuth about our `id` and `role` claims.
// ---------------------------------------------------------------------------

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
