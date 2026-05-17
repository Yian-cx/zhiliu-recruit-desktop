import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/guard";
import { writeFile } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "请选择文件" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "doc", "docx", "txt"].includes(ext)) {
    return NextResponse.json(
      { error: "仅支持 PDF、Word、TXT 格式" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name}`;
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
const filePath = path.join(uploadDir, filename);

  await writeFile(filePath, buffer);

  let content = "";
  if (ext === "txt") {
    content = buffer.toString("utf-8");
  } else {
    content = `[${file.name} 已上传，请在编辑器中输入简历内容]`;
  }

  return NextResponse.json({
    url: `/uploads/${filename}`,
    fileType: ext,
    content,
    filename: file.name,
  });
}
