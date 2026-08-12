"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({
  callbackUrl,
  serverError,
}: {
  callbackUrl: string;
  serverError?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);
    if (result?.error) {
      setError("The email or password you entered is incorrect.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          Password
        </label>
        <Input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {(error || serverError) && (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error ?? "Sign-in failed. Please try again."}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || !email || !password} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        New to LuxeMarket?{" "}
        <a
          href={`/register${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-medium text-gold hover:text-gold-dark"
        >
          Create an account
        </a>
      </p>
    </form>
  );
}
