"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerAction, type RegisterResult } from "./actions";

export function RegisterForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("callbackUrl", callbackUrl);

    const result = (await registerAction(formData)) as RegisterResult;

    if (!result.ok) {
      setPending(false);
      setError(result.error ?? null);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    // The action redirects on success; refresh keeps NextAuth's session
    // helpers in sync on the landing page.
    router.refresh();
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
          Full name
        </label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Maya Sharma"
        />
        {fieldError("name") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("name")}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        {fieldError("email") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("email")}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        {fieldError("password") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("password")}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink">
          Confirm password
        </label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repeat your password"
        />
        {fieldError("confirm") ? (
          <p className="mt-1 text-xs text-destructive">{fieldError("confirm")}</p>
        ) : null}
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Creating your account…" : "Create account"}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <a
          href={`/login${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-medium text-gold hover:text-gold-dark"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}