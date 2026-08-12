// One-off: creates 4 ACTIVE demo products with real images + reviews so they
// surface on the home "featured edit" and the shop grid immediately.
import { prisma } from "../src/lib/prisma";

async function main() {
  const vendor = await prisma.vendor.findFirst({ where: { status: "APPROVED" } });
  if (!vendor) throw new Error("No approved vendor found — run the seed first");

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    take: 15,
  });
  if (customers.length < 2) throw new Error("Need at least 2 customers — run the seed first");

  const categories = await prisma.category.findMany();
  const byName = (fragment: string) =>
    categories.find((c) => c.name.toLowerCase().includes(fragment));

  const demos = [
    {
      title: "Aurelius Gold Chronograph",
      slug: "aurelius-gold-chronograph",
      sku: "LM-DEMO-GOLD-01",
      priceCents: 129500,
      compareAtCents: 159500,
      inventory: 18,
      description:
        "A 38mm chronograph case in brushed 18k gold-tone steel with an ivory opaline dial, fine-link bracelet and sapphire glass. Delivered in a lacquered presentation box with a two-year movement warranty.",
      ratingAvg: 5.0,
      ratingCount: 12,
      images: [
        { url: "/products/demo-gold-watch-a.png" },
        { url: "/products/demo-gold-watch-b.png" },
      ],
      category: byName("timepiece") ?? byName("watch"),
    },
    {
      title: "Verdi Leather Tote",
      slug: "verdi-leather-tote",
      sku: "LM-DEMO-TOTE-01",
      priceCents: 42900,
      compareAtCents: 52000,
      inventory: 24,
      description:
        "Full-grain vegetable-tanned leather tote with a structured base, suede interior and magnetic closure. Fits a 14-inch laptop; wears softer with every season.",
      ratingAvg: 4.9,
      ratingCount: 9,
      images: [
        { url: "/products/demo-leather-tote-a.png" },
        { url: "/products/demo-leather-tote-b.png" },
      ],
      category: byName("bag"),
    },
    {
      title: "Noir Ambré Eau de Parfum",
      slug: "noir-ambre-eau-de-parfum",
      sku: "LM-DEMO-PERFUME-01",
      priceCents: 9800,
      compareAtCents: 11900,
      inventory: 60,
      description:
        "An amber-oud composition with blackcurrant, saffron and smoked vetiver. 50ml extrait strength, crafted in small batches and bottled in heavyweight glass.",
      ratingAvg: 4.8,
      ratingCount: 7,
      images: [
        { url: "/products/demo-noir-perfume-a.png" },
        { url: "/products/demo-noir-perfume-b.png" },
      ],
      category: byName("fragrance") ?? byName("beauty"),
    },
    {
      title: "Court Sneaker in Ivory",
      slug: "court-sneaker-ivory",
      sku: "LM-DEMO-SNEAKER-01",
      priceCents: 14500,
      compareAtCents: 17000,
      inventory: 40,
      description:
        "Clean ivory leather sneaker on a gum cupsole with tonal stitching and a padded heel. Runs true to size; removable insole for orthotics.",
      ratingAvg: 4.7,
      ratingCount: 5,
      images: [
        { url: "/products/demo-court-sneaker-a.png" },
        { url: "/products/demo-court-sneaker-b.png" },
      ],
      category: byName("footwear") ?? byName("sneaker"),
    },
  ];

  const reviewsText = [
    "Beautiful piece, exactly as photographed.",
    "Quality far above the price point.",
    "Arrived quickly and well packaged.",
  ];

  for (const demo of demos) {
    const existing = await prisma.product.findUnique({ where: { slug: demo.slug } });
    if (existing) {
      console.log("skip (exists):", demo.slug);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: demo.category?.id ?? null,
        title: demo.title,
        slug: demo.slug,
        description: demo.description,
        priceCents: demo.priceCents,
        compareAtCents: demo.compareAtCents,
        currency: "USD",
        sku: demo.sku,
        inventory: demo.inventory,
        status: "ACTIVE",
        ratingAvg: demo.ratingAvg,
        ratingCount: demo.ratingCount,
        images: {
          create: demo.images.map((img, i) => ({
            url: img.url,
            alt: demo.title,
            position: i,
          })),
        },
        reviews: {
          create: Array.from({ length: demo.ratingCount }, (_, i) => ({
            customerId: customers[i % customers.length]!.id,
            rating: demo.ratingAvg >= 4.8 ? 5 : i % 3 === 0 ? 4 : 5,
            title: "Verified purchase",
            body: reviewsText[i % reviewsText.length],
            createdAt: new Date(Date.now() - (i + 1) * 86400000) as Date,
          })),
        },
      },
    });
    console.log("created:", product.slug, "->", demo.images[0]!.url);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());