import type { ImageData } from "./types";

/**
 * Brand art lives in `/public/brand` and `/public/products`. Product art is
 * generated per product; these constants only cover the sitewide frames.
 */
export const PRODUCT_PLACEHOLDER = "/products/placeholder.png";

export const BRAND = {
  hero: "/brand/hero-editorial.jpg",
  makers: "/brand/interior-minimal.jpg",
  journal: "/brand/jewelry-model.jpg",
  storeBanner: "/brand/banner.png",
} as const;

/** Resolve the primary image for a product, falling back to the placeholder. */
export function primaryImage(images?: ImageData[] | null): ImageData {
  if (images && images.length > 0) {
    const sorted = [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    return sorted[0]!;
  }
  return { url: PRODUCT_PLACEHOLDER, alt: null };
}

/** Ordered gallery images with a guaranteed non-empty result. */
export function galleryImages(images?: ImageData[] | null): ImageData[] {
  if (images && images.length > 0) {
    return [...images].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  return [{ url: PRODUCT_PLACEHOLDER, alt: null }];
}
