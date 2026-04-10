import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);


function getSafeExtension(file: File): string | null {
  const extFromName = path.extname(file.name).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(extFromName)) {
    return extFromName;
  }
  switch (file.type) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return null;
  }
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: jpg, jpeg, png, webp, gif" },
      { status: 415 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "File too large. Max size is 5MB" }, { status: 413 });
  }

  const extension = getSafeExtension(file);
  if (!extension) {
    return NextResponse.json({ error: "Unsupported image format" }, { status: 415 });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "funds");
  await mkdir(uploadsDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  return NextResponse.json({ url: `/uploads/funds/${fileName}` });
}
