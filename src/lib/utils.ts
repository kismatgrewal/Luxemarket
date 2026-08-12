import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount of minor units (cents) as a currency string. */
export function formatMoney(cents: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/** Compact number formatting for dashboard stat tiles (1.2K, 3.4M). */
export function formatCompact(value: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** URL-safe slug from an arbitrary title. */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Human-friendly relative time (e.g. "3 days ago"). */
export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let prev = 1;
  for (const [limit, unit] of units) {
    if (seconds < limit) return rtf.format(-Math.floor(seconds / prev), unit);
    prev = limit;
  }
  return "just now";
}
