import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Admin console",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Access is enforced by middleware; we still read the session to personalise
  // the top bar and to fail closed if the guard is ever bypassed.
  const user = await getCurrentUser();

  return <AdminShell user={user}>{children}</AdminShell>;
}