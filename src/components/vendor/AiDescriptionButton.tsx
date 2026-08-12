"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDescriptionAction } from "@/server/actions/products";

/**
 * Drafts a product description with the OpenAI copy generator and hands the
 * result back to the form. Disabled until there's a title to work from.
 */
export function AiDescriptionButton({
  title,
  category,
  onGenerated,
}: {
  title: string;
  category?: string;
  onGenerated: (description: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = title.trim().length >= 3;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await generateDescriptionAction({ title: title.trim(), category });
        if (!result.ok) throw new Error(result.error ?? "empty");
        const text = result.data.description;
        if (!text) throw new Error("empty");
        onGenerated(text);
      } catch {
        setError("Couldn't draft copy just now. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="gold"
        size="sm"
        onClick={handleClick}
        disabled={!ready || pending}
        title={ready ? undefined : "Add a product title first"}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {pending ? "Writing…" : "Generate with AI"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
