// Generates placeholder product images as real PNG files (no external deps):
// gradient backdrop + shelf band + soft orb, 500x625 (4:5 product ratio).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "products");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function png(width, height, pixelFn) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]));
    const row = Buffer.alloc(width * 4);
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, y);
      row.writeUInt8(r, x * 4);
      row.writeUInt8(g, x * 4 + 1);
      row.writeUInt8(b, x * 4 + 2);
      row.writeUInt8(255, x * 4 + 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// frame(x, y) -> [r, g, b]. Draws:
//   vertical gradient, a highlight orb top-left, and a darker shelf band at
//   the bottom third.
function scene(topColor, bottomColor, orbScale, shift) {
  const top = hexToRgb(topColor);
  const bottom = hexToRgb(bottomColor);
  const W = 500;
  const H = 625;
  return (x, y) => {
    const t = y / H;
    let r = top[0] + (bottom[0] - top[0]) * t;
    let g = top[1] + (bottom[1] - top[1]) * t;
    let b = top[2] + (bottom[2] - top[2]) * t;

    // soft radial highlight near the top-left
    const dx = x - (W * 0.32 + shift) / 1;
    const dy = y - H * 0.24;
    const d = Math.sqrt(dx * dx + dy * dy) / (W * 0.42 * orbScale);
    if (d < 1) {
      const mix = (1 - d) * 0.25;
      r += (255 - r) * mix;
      g += (255 - g) * mix;
      b += (255 - b) * mix;
    }

    // shelf band across the bottom third
    const shelfTop = H * 0.66;
    if (y > shelfTop) {
      const st = Math.min(1, (y - shelfTop) / (H * 0.12));
      r *= 1 - st * 0.45;
      g *= 1 - st * 0.45;
      b *= 1 - st * 0.45;
    }

    // thin light line at the shelf edge
    if (y > shelfTop && y < shelfTop + 6) {
      r += 18;
      g += 18;
      b += 18;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  };
}

const demos = [
  {
    file: "demo-gold-watch-a.png",
    colors: ["#c9a227", "#6d5213"],
  },
  {
    file: "demo-gold-watch-b.png",
    colors: ["#dfc06a", "#8a6a1e"],
  },
  {
    file: "demo-leather-tote-a.png",
    colors: ["#8a5a3b", "#3c2417"],
  },
  {
    file: "demo-leather-tote-b.png",
    colors: ["#a5724e", "#4d2e1c"],
  },
  {
    file: "demo-noir-perfume-a.png",
    colors: ["#2c2c33", "#0b0b10"],
  },
  {
    file: "demo-noir-perfume-b.png",
    colors: ["#403f4a", "#131318"],
  },
  {
    file: "demo-court-sneaker-a.png",
    colors: ["#e8e4da", "#9a938a"],
  },
  {
    file: "demo-court-sneaker-b.png",
    colors: ["#f2efe7", "#b0a89c"],
  },
];

mkdirSync(ROOT, { recursive: true });
for (const [i, demo] of demos.entries()) {
  const frame = scene(demo.colors[0], demo.colors[1], 1 + (i % 2) * 0.25, (i % 3) * 90);
  const out = join(ROOT, demo.file);
  writeFileSync(out, png(500, 625, frame));
  console.log("wrote", out);
}
console.log("done —", demos.length, "images");