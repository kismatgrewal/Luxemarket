import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const user = await getCurrentUser().catch(() => null);
  const callbackUrl =
    searchParams.callbackUrl && searchParams.callbackUrl.startsWith("/")
      ? searchParams.callbackUrl
      : "/";
  if (user) redirect(callbackUrl);

  return (
    <div className="container flex justify-center py-16 md:py-24">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-ink/8 bg-white p-8 shadow-card">
          <p className="eyebrow">Join LuxeMarket</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight text-ink">Create an account</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Register to shop, save pieces to your cart and track your orders.
          </p>

          <RegisterForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}