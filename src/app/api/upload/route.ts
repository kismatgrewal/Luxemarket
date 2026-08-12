import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Products created by vendors carry real image files, stored in the repo's
// `public/products/uploads` directory so <img src="/products/uploads/..."> just
// works during development. Only VENDOR/ADMIN sessions may upload.
export async function POST(req: Request) {
  const token = await getToken({ req: req as NextRequest, secret: env.NEXTAUTH_SECRET });
  const role = token?.role;
  if (role !== "VENDOR" && role !== "ADMIN") {
    return NextResponse.json({ error: "You must be signed in as a vendor to upload images." }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP or GIF images are allowed." },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Images must be under 5 MB." }, { status: 400 });
  }

  const name = `p-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${EXT[file.type]}`;
  const dir = path.join(process.cwd(), "public", "products", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/products/uploads/${name}` });
}