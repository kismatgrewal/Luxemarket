"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useFieldArray, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, ImageOff, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createProductAction, updateProductAction } from "@/server/actions/products";
import type { ActionResult } from "@/types";
import { AiDescriptionButton } from "./AiDescriptionButton";

// Inputs stay as strings (they come from text fields); Zod validates and
// transforms them, so the parsed output carries real numbers / null.
const schema = z.object({
  title: z.string().trim().min(3, "Give your product a descriptive title"),
  categoryId: z.string().min(1, "Choose a category"),
  status: z.enum(["DRAFT", "ACTIVE"]),
  description: z.string().trim().min(20, "Add at least a sentence or two"),
  price: z
    .string()
    .trim()
    .refine((v) => Number(v) > 0, "Enter a price above zero")
    .transform(Number),
  compareAt: z
    .string()
    .trim()
    .refine((v) => v === "" || Number(v) > 0, "Enter a valid amount")
    .transform((v) => (v === "" ? null : Number(v))),
  sku: z.string().trim().min(2, "SKU is required"),
  inventory: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v), "Whole units only")
    .transform(Number),
  images: z
    .array(z.object({ url: z.string().trim().url("Enter a valid image URL") }))
    .min(1, "Add at least one image"),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

// @hookform/resolvers 3.x types its resolvers without the RHF 7.4+
// TTransformedValues generic; bridge the two so the form stays fully typed.
const resolver = zodResolver(schema) as unknown as Resolver<FormInput, unknown, FormOutput>;

export type CategoryOption = { id: string; name: string };

export type ProductFormValue = {
  id: string;
  title: string;
  categoryId: string | null;
  status: "DRAFT" | "ACTIVE";
  description: string;
  sku: string | null;
  inventory: number;
  priceCents: number;
  compareAtCents: number | null;
  images: { url: string }[];
  /** Set when editing as an admin so the store choice is preselected. */
  vendorId?: string;
};

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

export function ProductForm({
  categories,
  product,
  vendors,
}: {
  categories: CategoryOption[];
  product?: ProductFormValue;
  /** When provided (admin mode), the listing's target store is a required choice. */
  vendors?: { id: string; storeName: string }[];
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string>(vendors ? product?.vendorId ?? "" : "");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver,
    defaultValues: product
      ? {
          title: product.title,
          categoryId: product.categoryId ?? "",
          status: product.status,
          description: product.description,
          price: String(product.priceCents / 100),
          compareAt: product.compareAtCents != null ? String(product.compareAtCents / 100) : "",
          sku: product.sku ?? "",
          inventory: String(product.inventory),
          images: product.images.length ? product.images : [{ url: "" }],
        }
      : {
          title: "",
          categoryId: "",
          status: "DRAFT",
          description: "",
          price: "",
          compareAt: "",
          sku: "",
          inventory: "0",
          images: [{ url: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "images" });

  const title = watch("title");
  const categoryId = watch("categoryId");
  const categoryName = categories.find((c) => c.id === categoryId)?.name;
  const images = watch("images");

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleImageUpload(
    index: number,
    file: File | undefined,
  ): Promise<void> {
    if (!file) return;
    setUploadingIndex(index);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok || !data?.url) {
        setUploadError(data?.error ?? "Upload failed. Try again.");
        return;
      }
      setValue(`images.${index}.url`, data.url, { shouldDirty: true });
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function onSubmit(data: FormOutput) {
    setFormError(null);
    const payload = {
      title: data.title,
      categoryId: data.categoryId,
      status: data.status,
      description: data.description,
      sku: data.sku,
      inventory: data.inventory,
      priceCents: Math.round(data.price * 100),
      compareAtCents: data.compareAt != null ? Math.round(data.compareAt * 100) : undefined,
      images: data.images.map((i) => ({ url: i.url })),
      ...(vendors ? { vendorId } : {}),
    };

    if (vendors && !vendorId) {
      setFormError("Choose which store this product belongs to.");
      return;
    }

    let result: ActionResult<{ id: string; slug: string }>;
    try {
      result = product
        ? await updateProductAction({ id: product.id, ...payload })
        : await createProductAction(payload);

      if (!result.ok) {
        setFormError(result.error ?? "Something went wrong. Try again.");
        return;
      }

      router.push(vendors ? "/admin/catalog" : "/vendor/products");
      router.refresh();
    } catch {
      setFormError("Couldn't save the product. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
      {/* Main column */}
      <div className="space-y-6 lg:col-span-2">
        <section className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-ink">Details</h2>
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input
                id="title"
                placeholder="Hand-stitched leather weekender"
                {...register("title")}
              />
              <FieldError message={errors.title?.message} />
            </div>

            <div>
              <div className="flex items-end justify-between gap-3">
                <FieldLabel htmlFor="description">Description</FieldLabel>
                <AiDescriptionButton
                  title={title}
                  category={categoryName}
                  onGenerated={(text) =>
                    setValue("description", text, { shouldValidate: true, shouldDirty: true })
                  }
                />
              </div>
              <textarea
                id="description"
                rows={6}
                placeholder="Describe the materials, craftsmanship, and what makes it special…"
                className="flex w-full rounded-md border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-muted focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/30"
                {...register("description")}
              />
              <FieldError message={errors.description?.message} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-ink">Images</h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append({ url: "" })}
            >
              <Plus className="h-4 w-4" />
              Add image
            </Button>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Upload from your device, or paste a <code className="rounded bg-ink/5 px-1">/products/*.jpg</code> path
            or hosted URL. The first image is the primary.
          </p>
          {uploadError ? (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {uploadError}
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            {fields.map((field, index) => {
              const url = images?.[index]?.url;
              const uploading = uploadingIndex === index;
              return (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-md bg-ivory-deep">
                    {uploading ? (
                      <span className="flex h-full w-full items-center justify-center text-ink-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </span>
                    ) : url ? (
                      // Arbitrary hosts: plain img avoids next/image domain config.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.visibility = "hidden";
                        }}
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-muted">
                        <ImageOff className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input placeholder="/products/example.jpg" {...register(`images.${index}.url`)} />
                    <FieldError message={errors.images?.[index]?.url?.message} />
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-dark">
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Uploading…" : "Upload from device"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          void handleImageUpload(index, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remove image"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-ink-muted" />
                  </Button>
                </div>
              );
            })}
            {typeof errors.images?.message === "string" ? (
              <FieldError message={errors.images.message} />
            ) : null}
          </div>
        </section>
      </div>

      {/* Sidebar column */}
      <div className="space-y-6">
        <section className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-ink">Organization</h2>
          <div className="mt-4 space-y-4">
            {vendors ? (
              <div>
                <FieldLabel>Store</FieldLabel>
                <Select value={vendorId} onValueChange={(v) => setVendorId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.storeName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div>
              <FieldLabel>Category</FieldLabel>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.categoryId?.message} />
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft — hidden from buyers</SelectItem>
                      <SelectItem value="ACTIVE">Active — live in your store</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.status?.message} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-ink">Pricing</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="price">Price</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                  $
                </span>
                <Input
                  id="price"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                  {...register("price")}
                />
              </div>
              <FieldError message={errors.price?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="compareAt">Compare-at</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-muted">
                  $
                </span>
                <Input
                  id="compareAt"
                  inputMode="decimal"
                  placeholder="0.00"
                  className="pl-7"
                  {...register("compareAt")}
                />
              </div>
              <FieldError message={errors.compareAt?.message} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-ink/8 bg-white p-6 shadow-card">
          <h2 className="font-serif text-lg text-ink">Inventory</h2>
          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel htmlFor="sku">SKU</FieldLabel>
              <Input id="sku" placeholder="LM-WKND-001" {...register("sku")} />
              <FieldError message={errors.sku?.message} />
            </div>
            <div>
              <FieldLabel htmlFor="inventory">Units in stock</FieldLabel>
              <Input id="inventory" inputMode="numeric" {...register("inventory")} />
              <FieldError message={errors.inventory?.message} />
            </div>
          </div>
        </section>

        {formError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" disabled={isSubmitting} className={cn(isSubmitting && "opacity-80")}>
            {isSubmitting ? "Saving…" : "Save product"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/vendor/products")}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
