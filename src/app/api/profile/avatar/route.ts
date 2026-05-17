import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "请选择文件" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "仅支持 PNG、JPG、GIF、WebP 格式" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "头像文件不能超过 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const filename = `avatar-${user.id}.${ext}`;
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const avatarDir = path.join(uploadDir, "avatars");

  await mkdir(avatarDir, { recursive: true });
  await writeFile(path.join(avatarDir, filename), buffer);

  const avatarUrl = `/api/uploads/avatars/${filename}?t=${Date.now()}`;

  return NextResponse.json({ url: avatarUrl });
}
