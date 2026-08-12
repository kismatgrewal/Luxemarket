import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { slugify, timeAgo } from "@/lib/utils";

describe("slugify()", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Artisan Leather Tote")).toBe("artisan-leather-tote");
  });

  it("trims surrounding whitespace", () => {
    expect(slugify("  Trimmed  ")).toBe("trimmed");
  });

  it("collapses runs of separators into a single dash", () => {
    expect(slugify("multiple   spaces")).toBe("multiple-spaces");
    expect(slugify("Product!!! @#$ Name")).toBe("product-name");
  });

  it("strips punctuation and symbols", () => {
    expect(slugify("100% Cotton")).toBe("100-cotton");
    expect(slugify("UPPER_snake")).toBe("upper-snake");
    expect(slugify("Already-Slugged")).toBe("already-slugged");
  });

  it("drops non-ASCII / unicode characters", () => {
    // Accented letters are not transliterated — they are treated as separators.
    expect(slugify("Café Crème")).toBe("caf-cr-me");
    expect(slugify("naïve emoji 🎁 gift")).toBe("na-ve-emoji-gift");
  });

  it("removes leading and trailing dashes", () => {
    expect(slugify("---leading and trailing---")).toBe("leading-and-trailing");
    expect(slugify("!!!edgy!!!")).toBe("edgy");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("!!!")).toBe("");
  });
});

describe("timeAgo()", () => {
  // Freeze the clock so relative-time output is deterministic.
  const NOW = new Date("2026-07-10T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const ago = (ms: number) => new Date(NOW.getTime() - ms);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  it("formats seconds", () => {
    expect(timeAgo(ago(45 * SECOND))).toBe("45 seconds ago");
  });

  it("formats minutes, including the singular", () => {
    expect(timeAgo(ago(5 * MINUTE))).toBe("5 minutes ago");
    expect(timeAgo(ago(1 * MINUTE))).toBe("1 minute ago");
  });

  it("formats hours", () => {
    expect(timeAgo(ago(3 * HOUR))).toBe("3 hours ago");
  });

  it("formats days", () => {
    expect(timeAgo(ago(2 * DAY))).toBe("2 days ago");
  });

  it("uses the 'auto' wording for exactly one day (yesterday)", () => {
    expect(timeAgo(ago(1 * DAY))).toBe("yesterday");
  });

  it("formats weeks", () => {
    expect(timeAgo(ago(2 * WEEK))).toBe("2 weeks ago");
  });

  it("formats months", () => {
    // ~6 * average-month-in-seconds (2629800s) still resolves to months.
    expect(timeAgo(ago(6 * 2629800 * SECOND))).toBe("6 months ago");
  });

  it("formats years", () => {
    expect(timeAgo(ago(3 * 31557600 * SECOND))).toBe("3 years ago");
  });

  it("accepts an ISO date string as well as a Date", () => {
    const iso = ago(3 * HOUR).toISOString();
    expect(timeAgo(iso)).toBe("3 hours ago");
  });
});
