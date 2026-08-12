// Generates a local image for every product image, vendor logo and category
// image that is missing or remote, then rewrites the DB rows to the local
// paths. Output files are real PNGs with `.png` names so next/image's
// optimizer decodes them reliably.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

import { prisma } from "../src/lib/prisma";

const PUBLIC = path.join(process.cwd(), "public");

type Pixel = [number, number, number];

// ---------------------------------------------------------------------------
// Minimal PNG encoder (RGBA, no deps)
// ---------------------------------------------------------------------------

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]!) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(width: number, height: number, pixelFn: (x: number, y: number) => Pixel): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]));
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      row.writeUInt8(r!, x * 4);
      row.writeUInt8(g!, x * 4 + 1);
      row.writeUInt8(b!, x * 4 + 2);
      row.writeUInt8(255, x * 4 + 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex: string): Pixel {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// Vertical gradient + soft highlight orb + darker shelf band (product frame).
function frame(topColor: string, bottomColor: string, W = 500, H = 625, variant = 0): (x: number, y: number) => Pixel {
  const top = hexToRgb(topColor);
  const bottom = hexToRgb(bottomColor);
  return (x, y) => {
    const t = y / H;
    let r = top[0]! + (bottom[0]! - top[0]!) * t;
    let g = top[1]! + (bottom[1]! - top[1]!) * t;
    let b = top[2]! + (bottom[2]! - top[2]!) * t;

    const ox = W * (0.3 + (variant % 3) * 0.18);
    const oy = H * 0.24;
    const d = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2) / (W * 0.45);
    if (d < 1) {
      const mix = (1 - d) * 0.28;
      r += (255 - r) * mix;
      g += (255 - g) * mix;
      b += (255 - b) * mix;
    }

    const shelfTop = H * 0.66;
    if (y > shelfTop) {
      const st = Math.min(1, (y - shelfTop) / (H * 0.14));
      r *= 1 - st * 0.5;
      g *= 1 - st * 0.5;
      b *= 1 - st * 0.5;
    }
    if (y > shelfTop && y < shelfTop + 6) {
      r += 20;
      g += 20;
      b += 20;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  };
}

// Plain vertical gradient for logos / category tiles (square).
function tile(topColor: string, bottomColor: string, size = 480): (x: number, y: number) => Pixel {
  const top = hexToRgb(topColor);
  const bottom = hexToRgb(bottomColor);
  return (x, y) => {
    const t = y / size;
    let r = top[0]! + (bottom[0]! - top[0]!) * t;
    let g = top[1]! + (bottom[1]! - top[1]!) * t;
    let b = top[2]! + (bottom[2]! - top[2]!) * t;
    const cx = size / 2;
    const cy = size / 2;
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.62);
    if (d < 1) {
      const mix = (1 - d) * 0.18;
      r += (255 - r) * mix;
      g += (255 - g) * mix;
      b += (255 - b) * mix;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  };
}

const PALETTES: [string, string][] = [
  ["#8a5a3b", "#3c2417"], // tobacco / leather
  ["#3b3f4a", "#13151c"], // slate
  ["#5d4a3a", "#241c12"], // espresso
  ["#2f4f4f", "#122222"], // dark teal
  ["#7a4a2b", "#2e1708"], // bronze
  ["#454b63", "#1a1d2b"], // midnight
  ["#6d5d48", "#2a2216"], // tan
  ["#4a4455", "#18151f"], // plum haze
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function paletteFor(key: string): [string, string] {
  return PALETTES[hashStr(key) % PALETTES.length]!;
}

function writePng(target: string, pixelFn: (x: number, y: number) => Pixel, w: number, h: number): void {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, png(w, h, pixelFn));
}

// ---------------------------------------------------------------------------
// 1) Product images
// ---------------------------------------------------------------------------

async function fixProductImages(): Promise<void> {
  const rows = await prisma.productImage.findMany({
    include: { product: { select: { slug: true } } },
    orderBy: { position: "asc" },
  });
  let generated = 0;
  let updated = 0;

  for (const row of rows) {
    const isRemote = row.url.startsWith("http");
    const isLocal = !isRemote;
    const localPath = isLocal ? path.join(PUBLIC, row.url) : null;
    const fileExists = localPath ? existsSync(localPath) : false;

    if (!isRemote && fileExists) continue; // already fine

    const variant = row.position % 3;
    const newName = `${row.product.slug}-img${row.position}.png`;
    const newUrl = `/products/${newName}`;
    const target = path.join(PUBLIC, "products", newName);

    const colors = paletteFor(row.product.slug + row.position);
    writePng(target, frame(colors[0], colors[1], 500, 625, variant), 500, 625);
    generated++;

    if (isRemote || target !== localPath) {
      await prisma.productImage.update({ where: { id: row.id }, data: { url: newUrl } });
      updated++;
    }
  }
  console.log(`products: ${generated} generated, ${updated} DB rows updated`);
}

// ---------------------------------------------------------------------------
// 2) Vendor logos
// ---------------------------------------------------------------------------

async function fixVendorLogos(): Promise<void> {
  const vendors = await prisma.vendor.findMany({
    select: { id: true, slug: true, storeName: true, logoUrl: true },
  });
  let count = 0;
  for (const v of vendors) {
    const name = v.logoUrl?.startsWith("/vendors/")
      ? v.logoUrl.split("/").pop()!
      : `${v.slug}-logo.png`;
    const target = path.join(PUBLIC, "vendors", name);
    if (existsSync(target)) continue;
    const colors = paletteFor(v.slug);
    writePng(target, tile(colors[0], colors[1], 480), 480, 480);
    await prisma.vendor.update({
      where: { id: v.id },
      data: { logoUrl: `/vendors/${name}` },
    });
    count++;
  }
  console.log(`vendors: ${count} logos generated`);
}

// ---------------------------------------------------------------------------
// 3) Category tiles
// ---------------------------------------------------------------------------

async function fixCategoryImages(): Promise<void> {
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, imageUrl: true },
  });
  let count = 0;
  for (const c of categories) {
    const name = c.imageUrl?.startsWith("/categories/")
      ? c.imageUrl.split("/").pop()!
      : `${c.slug}.png`;
    const target = path.join(PUBLIC, "categories", name);
    if (existsSync(target)) continue;
    const colors = paletteFor(c.slug);
    writePng(target, tile(colors[0], colors[1], 640), 640, 640);
    await prisma.category.update({
      where: { id: c.id },
      data: { imageUrl: `/categories/${name}` },
    });
    count++;
  }
  console.log(`categories: ${count} tiles generated`);
}

// ---------------------------------------------------------------------------
// 4) Placeholder used as fallback in components
// ---------------------------------------------------------------------------

function fixPlaceholder(): void {
  const colors = paletteFor("placeholder");
  const target = path.join(PUBLIC, "products", "placeholder.png");
  writePng(target, frame(colors[0], colors[1], 500, 625, 1), 500, 625);
  console.log("placeholder: generated /products/placeholder.png");
}

async function main(): Promise<void> {
  await fixProductImages();
  await fixVendorLogos();
  await fixCategoryImages();
  fixPlaceholder();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());