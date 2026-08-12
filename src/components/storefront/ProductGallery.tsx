"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ImageData } from "./types";

/**
 * PDP gallery: a large primary frame with a thumbnail rail. Thumbnails select
 * the active image; with a single image it collapses to just the frame.
 */
export function ProductGallery({
  images,
  title,
  className,
}: {
  images: ImageData[];
  title: string;
  className?: string;
}) {
  const [active, setActive] = React.useState(0);
  const current = images[active] ?? images[0]!;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-ivory-deep">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt ?? title}
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="object-cover animate-fade-up"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-3">
          {images.slice(0, 5).map((image, i) => (
            <button
              key={image.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={cn(
                "relative aspect-square overflow-hidden rounded-md bg-ivory-deep ring-1 transition-all",
                i === active ? "ring-2 ring-gold-deep" : "ring-ink/8 hover:ring-ink/25",
              )}
            >
              <Image
                src={image.url}
                alt={image.alt ?? `${title} thumbnail ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
