"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  function handleClick() {
    setPending(true);
    void signOut({ callbackUrl: "/" });
  }

  return (
    <Button type="button" variant="outline" className="w-full" disabled={pending} onClick={handleClick}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      Sign out
    </Button>
  );
}
