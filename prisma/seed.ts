/**
 * LuxeMarket database seed.
 *
 * Produces a realistic, fully-linked marketplace: one admin, a spread of vendors
 * across every approval state, a curated catalog, customers with addresses, and
 * thirty orders spanning the whole lifecycle (pending → delivered, plus a couple
 * cancelled/refunded), then reviews and vendor payouts. Everything is
 * deterministic — a seeded PRNG and fixed salts — so `pnpm db:seed` yields the
 * same data every run and screenshots stay stable.
 *
 * Run with: `pnpm db:seed` (tsx prisma/seed.ts).
 */

import { scryptSync } from "node:crypto";

import {
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  PrismaClient,
  ProductStatus,
  ShipmentStatus,
  VendorStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** Seeded PRNG (mulberry32) — same sequence every run. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = makeRng(20260710);

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(randInt(8, 20), randInt(0, 59), 0, 0);
  return d;
}

// All seed users share this password; the auth layer verifies `scrypt$salt$hash`.
const DEMO_PASSWORD = "Passw0rd!";
function hashPassword(password: string): string {
  const salt = "luxemarket-seed";
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}
const PASSWORD_HASH = hashPassword(DEMO_PASSWORD);

// Illustrative Unsplash photo ids, cycled by index for the secondary image.
const UNSPLASH_IDS = [
  "1523275335684-37898b6baf30",
  "1526170375885-4d8ecf77b99f",
  "1611591437281-460bfbe1220a",
  "1606813907291-d86efa9b94db",
  "1584917865442-de89df76afd3",
  "1542291026-7eec264c27ff",
  "1595950653106-6c9ebd614d3a",
  "1512436991641-6745cdb1723f",
  "1608042314453-ae338d80c427",
  "1519744792095-2f2205e87b6f",
  "1547887538-e3a2f32cb1cc",
  "1560343090-f0409e92791a",
];

function productImages(slug: string, title: string, idx: number) {
  const photo = UNSPLASH_IDS[idx % UNSPLASH_IDS.length];
  return [
    { url: `/products/${slug}.jpg`, alt: title, position: 0 },
    {
      url: `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=1400&q=80`,
      alt: `${title} — detail`,
      position: 1,
    },
  ];
}

// ---------------------------------------------------------------------------
// Static catalog definitions
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { name: "Timepieces", slug: "timepieces", code: "TIM", basePrice: 48_000 },
  { name: "Leather Goods", slug: "leather-goods", code: "LEA", basePrice: 22_000 },
  { name: "Fine Jewelry", slug: "fine-jewelry", code: "JWL", basePrice: 64_000 },
  { name: "Home & Objets", slug: "home-objets", code: "HOM", basePrice: 14_000 },
  { name: "Fragrance", slug: "fragrance", code: "FRG", basePrice: 9_000 },
  { name: "Eyewear", slug: "eyewear", code: "EYE", basePrice: 18_000 },
  { name: "Stationery", slug: "stationery", code: "STA", basePrice: 7_000 },
  { name: "Barware", slug: "barware", code: "BAR", basePrice: 12_000 },
] as const;

// Two sub-categories under Home & Objets to exercise the self-referential tree.
const SUBCATEGORIES = [
  { name: "Lighting", slug: "lighting", code: "LGT", basePrice: 20_000, parent: "home-objets" },
  { name: "Textiles", slug: "textiles", code: "TEX", basePrice: 16_000, parent: "home-objets" },
] as const;

type VendorSeed = {
  slug: string;
  storeName: string;
  email: string;
  contactName: string;
  status: VendorStatus;
  commissionBps: number;
  tagline: string;
  description: string;
};

const VENDORS: VendorSeed[] = [
  {
    slug: "atelier-verdi",
    storeName: "Atelier Verdi",
    email: "hello@atelierverdi.com",
    contactName: "Giulia Verdi",
    status: VendorStatus.APPROVED,
    commissionBps: 1000,
    tagline: "Milanese watchmaking & full-grain leather",
    description:
      "A third-generation Milanese atelier pairing mechanical timepieces with vegetable-tanned leather, made in small batches.",
  },
  {
    slug: "maison-lumiere",
    storeName: "Maison Lumière",
    email: "studio@maisonlumiere.com",
    contactName: "Camille Rousseau",
    status: VendorStatus.APPROVED,
    commissionBps: 1200,
    tagline: "Objects and scent for a considered home",
    description:
      "Hand-poured candles, blown glass, and lighting sourced from ateliers across Provence and Murano.",
  },
  {
    slug: "nord-and-field",
    storeName: "Nord & Field",
    email: "team@nordandfield.com",
    contactName: "Anders Holm",
    status: VendorStatus.APPROVED,
    commissionBps: 1500,
    tagline: "Barware and desk goods, quietly overbuilt",
    description:
      "Scandinavian-minimal barware and stationery in crystal, brass, and steel — built to be handed down.",
  },
  {
    slug: "aurelia-fine",
    storeName: "Aurelia Fine",
    email: "care@aureliafine.com",
    contactName: "Priya Nair",
    status: VendorStatus.APPROVED,
    commissionBps: 1100,
    tagline: "Solid-gold jewelry & handmade eyewear",
    description:
      "Recycled solid-gold jewelry and acetate eyewear, cut and finished by hand in a small Jaipur workshop.",
  },
  {
    slug: "copper-and-quill",
    storeName: "Copper & Quill",
    email: "founders@copperquill.com",
    contactName: "Theo Marsh",
    status: VendorStatus.PENDING,
    commissionBps: 1200,
    tagline: "Fountain pens and fine paper",
    description: "A new studio awaiting approval — fountain pens, wax seals, and mould-made paper.",
  },
  {
    slug: "halcyon-supply",
    storeName: "Halcyon Supply Co.",
    email: "ops@halcyonsupply.com",
    contactName: "Dana Okafor",
    status: VendorStatus.SUSPENDED,
    commissionBps: 1300,
    tagline: "Home goods — under review",
    description: "Store temporarily suspended pending a policy review.",
  },
  {
    slug: "meridian-trunk",
    storeName: "Meridian Trunk",
    email: "apply@meridiantrunk.com",
    contactName: "Sofia Marchetti",
    status: VendorStatus.REJECTED,
    commissionBps: 1200,
    tagline: "Application declined",
    description: "Application did not meet marketplace authenticity requirements.",
  },
];

// Product name pools, keyed by category slug. Vendor ownership is by category.
const PRODUCTS_BY_CATEGORY: Record<string, { names: string[]; vendor: string }> = {
  timepieces: {
    vendor: "atelier-verdi",
    names: [
      "Meridian Automatic Watch",
      "Nocturne Moonphase Watch",
      "Regatta Chronograph",
      "Aviator Field Watch",
      "Promenade Dress Watch",
    ],
  },
  "leather-goods": {
    vendor: "atelier-verdi",
    names: [
      "Weekender Duffle in Calf",
      "Bifold Card Wallet",
      "Structured Leather Tote",
      "Passport Sleeve",
      "Full-Grain Belt",
      "Document Folio",
    ],
  },
  "fine-jewelry": {
    vendor: "aurelia-fine",
    names: [
      "Solitaire Signet Ring",
      "Fine Curb Chain",
      "Baroque Pearl Studs",
      "Bezel Diamond Pendant",
      "Brushed Gold Cuff",
    ],
  },
  eyewear: {
    vendor: "aurelia-fine",
    names: [
      "Acetate Round Frames",
      "Titanium Aviators",
      "Tortoise Reading Glasses",
      "Polarized Clubmasters",
    ],
  },
  "home-objets": {
    vendor: "maison-lumiere",
    names: ["Travertine Bookends", "Hand-Blown Bud Vase", "Ceramic Incense Holder", "Marble Catchall"],
  },
  lighting: {
    vendor: "maison-lumiere",
    names: ["Alabaster Table Lamp", "Brass Picture Light"],
  },
  textiles: {
    vendor: "maison-lumiere",
    names: ["Cashmere Throw", "Linen Table Runner"],
  },
  fragrance: {
    vendor: "maison-lumiere",
    names: ["Eau de Parfum No. 7", "Cedar & Smoke Candle", "Neroli Room Mist", "Vetiver Solid Cologne"],
  },
  barware: {
    vendor: "nord-and-field",
    names: [
      "Crystal Decanter",
      "Coupe Glass Set",
      "Stirring Spoon in Steel",
      "Japanese Jigger",
      "Marble Coaster Set",
    ],
  },
  stationery: {
    vendor: "nord-and-field",
    names: ["Brass Fountain Pen", "Leather Desk Pad", "Linen Notebook Set", "Wax Seal Kit"],
  },
};

const CUSTOMERS = [
  "Elena Rossi",
  "Marcus Chen",
  "Amara Okoye",
  "James Whitfield",
  "Sofia Herrera",
  "Liam O'Brien",
  "Yuki Tanaka",
  "Nadia Haddad",
  "Oliver Bennett",
  "Isabella Moretti",
  "Rahul Kapoor",
  "Grace Kim",
  "Thomas Muller",
  "Fatima Al-Sayed",
  "Henry Adler",
];

const CITIES = [
  ["New York", "NY", "10012"],
  ["San Francisco", "CA", "94110"],
  ["Chicago", "IL", "60614"],
  ["Austin", "TX", "78704"],
  ["Seattle", "WA", "98103"],
  ["Boston", "MA", "02116"],
  ["Miami", "FL", "33139"],
  ["Denver", "CO", "80206"],
];

const STREETS = ["Larkspur Lane", "Chestnut Street", "Maple Court", "Harbor View", "Willow Way", "Bishop Ave"];
const CARRIERS = ["FedEx", "UPS", "DHL Express"];
const REVIEW_TITLES = [
  "Exactly as pictured",
  "Beautifully made",
  "Worth every penny",
  "A new favorite",
  "Exceptional finish",
  "Impressed by the details",
];
const REVIEW_BODIES = [
  "The craftsmanship is obvious the moment you unbox it. Packaging was thoughtful and the finish is flawless.",
  "Shipped quickly and looks even better in person. The materials feel genuinely premium.",
  "I was hesitant at the price but it's clearly built to last. No regrets.",
  "Gifted this and it was a hit — elegant, understated, and well presented.",
  "Small details set it apart. You can tell it was made by people who care.",
];

// ---------------------------------------------------------------------------
// Seed routine
// ---------------------------------------------------------------------------

async function reset() {
  // Delete in FK-safe order so re-seeding is idempotent.
  await prisma.auditLog.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.review.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.address.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });
  await prisma.category.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  // --- Admin -------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      email: "admin@luxemarket.com",
      name: "Marketplace Admin",
      role: "ADMIN",
      passwordHash: PASSWORD_HASH,
      emailVerified: daysAgo(120),
    },
  });

  // --- Categories --------------------------------------------------------
  const categoryIdBySlug = new Map<string, string>();
  for (const c of CATEGORIES) {
    const cat = await prisma.category.create({
      data: { name: c.name, slug: c.slug, imageUrl: `/categories/${c.slug}.jpg` },
    });
    categoryIdBySlug.set(c.slug, cat.id);
  }
  for (const s of SUBCATEGORIES) {
    const cat = await prisma.category.create({
      data: {
        name: s.name,
        slug: s.slug,
        imageUrl: `/categories/${s.slug}.jpg`,
        parentId: categoryIdBySlug.get(s.parent)!,
      },
    });
    categoryIdBySlug.set(s.slug, cat.id);
  }

  // --- Vendors -----------------------------------------------------------
  const vendorIdBySlug = new Map<string, string>();
  const commissionByVendorId = new Map<string, number>();
  for (const v of VENDORS) {
    const user = await prisma.user.create({
      data: {
        email: v.email,
        name: v.contactName,
        role: "VENDOR",
        passwordHash: PASSWORD_HASH,
        emailVerified: daysAgo(randInt(30, 100)),
      },
    });
    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        storeName: v.storeName,
        slug: v.slug,
        tagline: v.tagline,
        description: v.description,
        status: v.status,
        commissionBps: v.commissionBps,
        logoUrl: `/vendors/${v.slug}-logo.png`,
        bannerUrl: `/vendors/${v.slug}-banner.jpg`,
        stripeAccountId: v.status === VendorStatus.APPROVED ? `acct_seed_${v.slug.replace(/-/g, "")}` : null,
        createdAt: daysAgo(randInt(60, 200)),
      },
    });
    vendorIdBySlug.set(v.slug, vendor.id);
    commissionByVendorId.set(vendor.id, v.commissionBps);
  }

  // --- Products ----------------------------------------------------------
  type SeededProduct = { id: string; priceCents: number; vendorId: string; title: string; slug: string };
  const activeProducts: SeededProduct[] = [];
  let productIndex = 0;

  const categoryMeta = [...CATEGORIES, ...SUBCATEGORIES];

  for (const [slug, def] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    const meta = categoryMeta.find((c) => c.slug === slug)!;
    const vendorId = vendorIdBySlug.get(def.vendor)!;
    for (const name of def.names) {
      const productSlug = `${slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      // Spread prices around the category base; round to a tidy $X.00.
      const priceCents = Math.round((meta.basePrice * (0.7 + rand() * 0.9)) / 100) * 100;
      const onSale = productIndex % 3 === 0;
      const compareAtCents = onSale ? Math.round((priceCents * 1.28) / 100) * 100 : null;
      // A couple of out-of-stock and low-stock items for realistic dashboards.
      const inventory =
        productIndex % 11 === 0 ? 0 : productIndex % 7 === 0 ? randInt(1, 5) : randInt(12, 90);

      const product = await prisma.product.create({
        data: {
          vendorId,
          categoryId: categoryIdBySlug.get(slug)!,
          title: name,
          slug: productSlug,
          description: buildDescription(name, meta.name),
          priceCents,
          compareAtCents,
          currency: "USD",
          sku: `${VENDORS.find((v) => v.slug === def.vendor)!.storeName.slice(0, 2).toUpperCase()}-${meta.code}-${String(productIndex + 1).padStart(3, "0")}`,
          inventory,
          status: ProductStatus.ACTIVE,
          aiGenerated: productIndex % 4 === 0,
          createdAt: daysAgo(randInt(20, 180)),
          images: { create: productImages(productSlug, name, productIndex) },
        },
      });
      activeProducts.push({ id: product.id, priceCents, vendorId, title: name, slug: productSlug });
      productIndex++;
    }
  }

  // A few DRAFT products for the pending vendor, and ARCHIVED for the suspended one.
  await prisma.product.create({
    data: {
      vendorId: vendorIdBySlug.get("copper-and-quill")!,
      categoryId: categoryIdBySlug.get("stationery")!,
      title: "Mould-Made Letter Set",
      slug: "stationery-mould-made-letter-set",
      description: buildDescription("Mould-Made Letter Set", "Stationery"),
      priceCents: 6_500,
      currency: "USD",
      sku: "CO-STA-901",
      inventory: 40,
      status: ProductStatus.DRAFT,
      images: { create: productImages("stationery-mould-made-letter-set", "Mould-Made Letter Set", 1) },
    },
  });
  await prisma.product.create({
    data: {
      vendorId: vendorIdBySlug.get("halcyon-supply")!,
      categoryId: categoryIdBySlug.get("home-objets")!,
      title: "Stoneware Serving Bowl",
      slug: "home-objets-stoneware-serving-bowl",
      description: buildDescription("Stoneware Serving Bowl", "Home & Objets"),
      priceCents: 8_800,
      currency: "USD",
      sku: "HA-HOM-902",
      inventory: 15,
      status: ProductStatus.ARCHIVED,
      images: { create: productImages("home-objets-stoneware-serving-bowl", "Stoneware Serving Bowl", 2) },
    },
  });

  // --- Customers + addresses --------------------------------------------
  const customers: { id: string; name: string }[] = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const name = CUSTOMERS[i]!;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
    const [city, state, postal] = CITIES[i % CITIES.length]!;
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: "CUSTOMER",
        passwordHash: PASSWORD_HASH,
        emailVerified: daysAgo(randInt(5, 90)),
        createdAt: daysAgo(randInt(10, 120)),
        addresses: {
          create: {
            fullName: name,
            line1: `${randInt(12, 980)} ${pick(STREETS)}`,
            city: city!,
            state: state!,
            postalCode: postal!,
            country: "US",
            phone: `+1${randInt(200, 989)}${randInt(200, 989)}${randInt(1000, 9999)}`,
            isDefault: true,
          },
        },
      },
      include: { addresses: true },
    });
    customers.push({ id: user.id, name });
  }
  const addressByUser = new Map<string, string>();
  for (const c of customers) {
    const addr = await prisma.address.findFirst({ where: { userId: c.id }, select: { id: true } });
    if (addr) addressByUser.set(c.id, addr.id);
  }

  // --- Orders across the full lifecycle ---------------------------------
  // Weighted lifecycle distribution over 30 orders.
  const lifecycle: OrderStatus[] = [
    ...Array(3).fill(OrderStatus.PENDING),
    ...Array(5).fill(OrderStatus.PAID),
    ...Array(5).fill(OrderStatus.FULFILLED),
    ...Array(5).fill(OrderStatus.SHIPPED),
    ...Array(8).fill(OrderStatus.DELIVERED),
    ...Array(2).fill(OrderStatus.CANCELLED),
    ...Array(2).fill(OrderStatus.REFUNDED),
  ];

  const earningsByVendor = new Map<string, number>();
  // Track (product, customer) purchases so reviews only come from real buyers.
  const purchases: { productId: string; customerId: string; orderStatus: OrderStatus; when: Date }[] = [];

  for (let i = 0; i < lifecycle.length; i++) {
    const status = lifecycle[i]!;
    const customer = pick(customers);
    const placedAt = daysAgo(randInt(0, 40));
    const lineCount = randInt(1, 3);

    // Choose distinct in-stock products for the order lines.
    const chosen = new Set<SeededProduct>();
    while (chosen.size < lineCount) chosen.add(pick(activeProducts));

    const itemsData = [...chosen].map((p) => {
      const quantity = randInt(1, 2);
      const gross = p.priceCents * quantity;
      const bps = commissionByVendorId.get(p.vendorId) ?? 1200;
      const commissionCents = Math.round((gross * bps) / 10000);
      const vendorEarningsCents = gross - commissionCents;
      return {
        product: p,
        quantity,
        unitPriceCents: p.priceCents,
        commissionCents,
        vendorEarningsCents,
        fulfillmentStatus: fulfillmentForStatus(status),
      };
    });

    const subtotalCents = itemsData.reduce((s, it) => s + it.unitPriceCents * it.quantity, 0);
    const taxCents = Math.round((subtotalCents * 825) / 10000);
    const shippingCents = subtotalCents >= 15_000 ? 0 : 900;
    const totalCents = subtotalCents + taxCents + shippingCents;

    const isPaid = (
      [
        OrderStatus.PAID,
        OrderStatus.FULFILLED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
        OrderStatus.REFUNDED,
      ] as OrderStatus[]
    ).includes(status);

    const order = await prisma.order.create({
      data: {
        orderNumber: `LM-2026-${String(i + 1).padStart(4, "0")}`,
        customerId: customer.id,
        status,
        subtotalCents,
        taxCents,
        shippingCents,
        totalCents,
        currency: "USD",
        shippingAddressId: addressByUser.get(customer.id) ?? null,
        stripePaymentIntentId: isPaid ? `pi_seed_${String(i + 1).padStart(4, "0")}` : null,
        createdAt: placedAt,
        items: {
          create: itemsData.map((it) => ({
            productId: it.product.id,
            vendorId: it.product.vendorId,
            title: it.product.title,
            quantity: it.quantity,
            unitPriceCents: it.unitPriceCents,
            commissionCents: it.commissionCents,
            vendorEarningsCents: it.vendorEarningsCents,
            fulfillmentStatus: it.fulfillmentStatus,
          })),
        },
      },
    });

    // Accrue vendor earnings for revenue-recognised orders.
    if (
      (
        [
          OrderStatus.PAID,
          OrderStatus.FULFILLED,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ] as OrderStatus[]
      ).includes(status)
    ) {
      for (const it of itemsData) {
        earningsByVendor.set(
          it.product.vendorId,
          (earningsByVendor.get(it.product.vendorId) ?? 0) + it.vendorEarningsCents,
        );
        purchases.push({
          productId: it.product.id,
          customerId: customer.id,
          orderStatus: status,
          when: placedAt,
        });
      }
    }

    // Payment record for anything that was charged.
    if (isPaid) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          stripePaymentIntentId: order.stripePaymentIntentId!,
          amountCents: totalCents,
          currency: "USD",
          status: status === OrderStatus.REFUNDED ? PaymentStatus.REFUNDED : PaymentStatus.SUCCEEDED,
          method: pick(["visa", "mastercard", "amex", "apple_pay"]),
          createdAt: placedAt,
        },
      });
    }

    // Shipment for in-transit / delivered orders.
    if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
      const delivered = status === OrderStatus.DELIVERED;
      const carrier = pick(CARRIERS);
      const trackingNumber = `1Z${randInt(100000, 999999)}${randInt(100000, 999999)}`;
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          carrier,
          trackingNumber,
          status: delivered ? ShipmentStatus.DELIVERED : ShipmentStatus.IN_TRANSIT,
          estimatedDelivery: delivered ? placedAt : daysAgo(randInt(-4, -1)),
          events: buildShipmentEvents(placedAt, delivered),
          createdAt: placedAt,
        },
      });
    }
  }

  // --- Reviews (from real buyers) ---------------------------------------
  const reviewed = new Set<string>();
  let reviewCount = 0;
  for (const p of purchases) {
    if (p.orderStatus !== OrderStatus.DELIVERED && rand() > 0.4) continue; // most reviews follow delivery
    const key = `${p.productId}:${p.customerId}`;
    if (reviewed.has(key)) continue;
    reviewed.add(key);
    const rating = pick([5, 5, 5, 4, 4, 4, 3, 5, 4, 2]);
    await prisma.review.create({
      data: {
        productId: p.productId,
        customerId: p.customerId,
        rating,
        title: pick(REVIEW_TITLES),
        body: pick(REVIEW_BODIES),
        createdAt: new Date(p.when.getTime() + 1000 * 60 * 60 * randInt(24, 240)),
      },
    });
    reviewCount++;
  }

  // Recompute denormalised product ratings.
  const ratedProductIds = new Set([...reviewed].map((k) => k.split(":")[0]!));
  for (const productId of ratedProductIds) {
    const agg = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count.rating },
    });
  }

  // --- Vendor payouts + balances ----------------------------------------
  for (const v of VENDORS) {
    if (v.status !== VendorStatus.APPROVED) continue;
    const vendorId = vendorIdBySlug.get(v.slug)!;

    // Roll up vendor rating from its products' reviews.
    const vendorAgg = await prisma.review.aggregate({
      where: { product: { vendorId } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const totalEarnings = earningsByVendor.get(vendorId) ?? 0;
    // Half already paid out for a prior period; the rest is the current balance.
    const paidOut = Math.round(totalEarnings * 0.5);
    if (paidOut > 0) {
      await prisma.payout.create({
        data: {
          vendorId,
          amountCents: paidOut,
          currency: "USD",
          status: PayoutStatus.PAID,
          periodStart: daysAgo(60),
          periodEnd: daysAgo(31),
          stripeTransferId: `tr_seed_${v.slug.replace(/-/g, "")}`,
          createdAt: daysAgo(30),
        },
      });
      await prisma.payout.create({
        data: {
          vendorId,
          amountCents: Math.round((totalEarnings - paidOut) * 0.6),
          currency: "USD",
          status: PayoutStatus.IN_TRANSIT,
          periodStart: daysAgo(30),
          periodEnd: daysAgo(1),
          createdAt: daysAgo(1),
        },
      });
    }

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        payoutBalanceCents: Math.max(0, totalEarnings - paidOut),
        ratingAvg: vendorAgg._avg.rating ?? 0,
        ratingCount: vendorAgg._count.rating,
      },
    });
  }

  // --- A sample cart for the admin's demo shopper -----------------------
  const demoShopper = customers[0]!;
  const cart = await prisma.cart.create({ data: { userId: demoShopper.id } });
  const cartPicks = [activeProducts[2]!, activeProducts[9]!];
  for (const p of cartPicks) {
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p.id, quantity: 1 } });
  }

  // --- An audit trail entry so the admin log isn't empty ----------------
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.run",
      target: "marketplace",
      metadata: { note: "Initial deterministic seed", vendors: VENDORS.length },
    },
  });

  const totals = {
    admin: 1,
    vendors: VENDORS.length,
    categories: CATEGORIES.length + SUBCATEGORIES.length,
    products: await prisma.product.count(),
    customers: CUSTOMERS.length,
    orders: lifecycle.length,
    reviews: reviewCount,
    payouts: await prisma.payout.count(),
  };
  console.log("✅ Seed complete:", totals);
  console.log(`   Demo login — admin@luxemarket.com / ${DEMO_PASSWORD} (all users share this password)`);
}

// ---------------------------------------------------------------------------
// Content builders
// ---------------------------------------------------------------------------

function buildDescription(name: string, category: string): string {
  return [
    `The ${name} is part of our ${category.toLowerCase()} edit — chosen for materials that age well and details you only notice up close.`,
    `Made in small runs and finished by hand, it arrives in recyclable packaging with a card describing its provenance and care.`,
    `A quiet, lasting piece for people who would rather buy once and keep it.`,
  ].join("\n\n");
}

function fulfillmentForStatus(status: OrderStatus): FulfillmentStatus {
  switch (status) {
    case OrderStatus.FULFILLED:
      return FulfillmentStatus.PACKED;
    case OrderStatus.SHIPPED:
      return FulfillmentStatus.SHIPPED;
    case OrderStatus.DELIVERED:
      return FulfillmentStatus.DELIVERED;
    default:
      return FulfillmentStatus.UNFULFILLED;
  }
}

function buildShipmentEvents(placedAt: Date, delivered: boolean) {
  const events: { status: string; location: string; timestamp: string }[] = [
    { status: "LABEL_CREATED", location: "Origin facility", timestamp: placedAt.toISOString() },
    {
      status: "IN_TRANSIT",
      location: "Regional hub",
      timestamp: new Date(placedAt.getTime() + 864e5).toISOString(),
    },
  ];
  if (delivered) {
    events.push({
      status: "OUT_FOR_DELIVERY",
      location: "Local courier",
      timestamp: new Date(placedAt.getTime() + 2 * 864e5).toISOString(),
    });
    events.push({
      status: "DELIVERED",
      location: "Front desk",
      timestamp: new Date(placedAt.getTime() + 2.4 * 864e5).toISOString(),
    });
  }
  return events;
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
