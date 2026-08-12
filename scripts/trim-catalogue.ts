// Trims the catalogue to the four demo products (and their images) so the
// storefront shows exactly what the user asked for. Orders and reviews are
// wiped too — their data references the removed products.
import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

const KEEP_SLUGS = [
  "aurelius-gold-chronograph",
  "verdi-leather-tote",
  "noir-ambre-eau-de-parfum",
  "court-sneaker-ivory",
];

async function main() {
  const kept = await prisma.product.findMany({
    where: { slug: { in: KEEP_SLUGS } },
    include: { images: { select: { url: true } } },
  });
  if (kept.length !== KEEP_SLUGS.length) {
    throw new Error(`Expected ${KEEP_SLUGS.length} kept products, found ${kept.length}`);
  }

  const deletedOrders = await prisma.order.deleteMany({});
  const deletedReviews = await prisma.review.deleteMany({});
  const deletedProducts = await prisma.product.deleteMany({
    where: { slug: { notIn: KEEP_SLUGS } },
  });

  console.log(
    `orders: ${deletedOrders.count} deleted, reviews: ${deletedReviews.count} deleted, products: ${deletedProducts.count} deleted`,
  );

  const referenced = new Set<string>();
  for (const p of kept) {
    for (const img of p.images) referenced.add(img.url);
  }
  referenced.add("/products/placeholder.png");

  const dir = path.join(process.cwd(), "public", "products");
  let removed = 0;
  for (const file of readdirSync(dir)) {
    if (file.startsWith("demo-")) continue; // demo art used by kept products
    if (referenced.has(`/products/${file}`)) continue;
    rmSync(path.join(dir, file));
    removed++;
  }
  console.log(`cleaned ${removed} unreferenced image files`);
  console.log("kept products:", kept.map((p) => p.slug).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());