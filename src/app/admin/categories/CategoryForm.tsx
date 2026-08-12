"use client";

import * as React from "react";
import { useTransition } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  updateCategoryAction,
  type CategoryActionResult,
} from "./actions";

export function CategoryForm({
  categoryId,
  initial,
}: {
  categoryId?: string;
  initial?: { name: string; imageUrl: string | null };
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [imageUrl, setImageUrl] = React.useState(initial?.imageUrl ?? "");
  const [uploading, setUploading] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");

    startTransition(async () => {
      const result = (await (categoryId
        ? updateCategoryAction(categoryId, { name, imageUrl })
        : createCategoryAction({ name, imageUrl }))) as CategoryActionResult;
      if (result && !result.ok) {
        setError(result.error ?? "Couldn't save the category.");
      }
    });
    // On success the server action redirects to the list.
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => null)) as { url?: string } | null;
      if (res.ok && data?.url) {
        setImageUrl(data.url);
      } else {
        setError("Upload failed. Try again.");
      }
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
          Category name
        </label>
        <Input id="name" name="name" required defaultValue={initial?.name} placeholder="e.g. Leather goods" />
        <p className="mt-1.5 text-xs text-ink-muted">
          Slug apne aap banega (e.g. &ldquo;Leather goods&rdquo; → &ldquo;leather-goods&rdquo;). Change karo to naya slug banta hai.
        </p>
      </div>

      <div>
        <label htmlFor="imageUrl" className="mb-1.5 block text-sm font-medium text-ink">
          Image URL
        </label>
        <Input
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="/categories/leather-goods.jpg or /products/uploads/p-…"
        />
        <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-dark">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading…" : "Upload from device"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              void handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Category preview"
          className="h-24 w-24 rounded-md border border-ink/8 bg-ivory-deep object-cover"
        />
      ) : null}

      {error ? (
        <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending || uploading}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {categoryId ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}