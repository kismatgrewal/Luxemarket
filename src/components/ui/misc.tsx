import * as React from "react";
import { cn } from "@/lib/utils";

/** Thin horizontal rule matched to the design tokens. */
export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-ink/8", className)} role="separator" {...props} />;
}

/** Loading placeholder. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-ink/5", className)} {...props} />;
}

/** Simple avatar with initials fallback. */
export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-ink/10 text-xs font-medium text-ink",
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
