import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string; registered?: string };
}) {
  // Only allow same-origin relative callbacks so the redirect target can't be
  // used as an open redirect.
  const callbackUrl =
    searchParams.callbackUrl && searchParams.callbackUrl.startsWith("/")
      ? searchParams.callbackUrl
      : "/";

  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(callbackUrl);

  return (
    <div className="container flex justify-center py-16 md:py-24">
      <div className="w-full max-w-md">
        {searchParams.registered === "1" ? (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Account created! Sign in below to continue.
          </div>
        ) : null}
        <div className="rounded-lg border border-ink/8 bg-white p-8 shadow-card">
          <p className="eyebrow">Welcome back</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Sign in</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Access your account, orders and saved pieces.
          </p>

          <LoginForm callbackUrl={callbackUrl} serverError={searchParams.error} />
        </div>
      </div>
    </div>
  );
}
