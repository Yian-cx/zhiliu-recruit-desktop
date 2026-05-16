"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Upload,
  Bookmark,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";

interface Resume {
  id: string;
  name: string;
  content: string;
  fileUrl: string | null;
  fileType: string | null;
  isDefault: boolean;
  updatedAt: string;
  _count: { jobResumes: number };
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchResumes = useCallback(async () => {
    const res = await fetch("/api/resumes");
    if (res.ok) setResumes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  async function createResume(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newName.trim()) return;

    const res = await fetch("/api/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("简历已创建");
      setNewName("");
      setShowNew(false);
      router.push(`/resumes/${data.id}`);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/resumes/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      // Create a resume from the upload
      const createRes = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name.replace(/\.[^.]+$/, ""),
          content: data.content,
        }),
      });
      if (createRes.ok) {
        const newResume = await createRes.json();
        toast.success("文件上传成功");
        router.push(`/resumes/${newResume.id}`);
      }
    } else {
      const err = await res.json();
      toast.error(err.error || "上传失败");
    }
    setUploading(false);
  }

  async function toggleDefault(resume: Resume) {
    const res = await fetch(`/api/resumes/${resume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: !resume.isDefault }),
    });
    if (res.ok) fetchResumes();
  }

  async function deleteResume(id: string) {
    if (!confirm("确定删除这份简历吗？")) return;
    const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("简历已删除");
      fetchResumes();
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">简历管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            多版本简历管理，上传或在线编辑
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}>
            <Upload className="size-4 mr-2" />
            {uploading ? "上传中..." : "上传简历"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger render={
              <Button>
                <Plus className="size-4 mr-2" />
                新建简历
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新建简历</DialogTitle>
                <DialogDescription>
                  输入简历名称开始编辑
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createResume} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">简历名称</Label>
                  <Input
                    id="name"
                    placeholder="例：前端开发-2026"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full">
                  创建
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i} className="glass border-0 animate-pulse">
              <CardContent className="p-6 h-16" />
            </Card>
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <FileText className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">还没有简历，上传或新建一份</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => (
            <Card
              key={r.id}
              className="glass border-0 hover:bg-white/[0.07] transition-all duration-200 cursor-pointer group"
              onClick={() => router.push(`/resumes/${r.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="size-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {r.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r._count.jobResumes} 个关联岗位
                      {r.fileType && ` · ${r.fileType.toUpperCase()}`}
                      {r.isDefault && " · 默认"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleDefault(r);
                    }}
                    className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                    title={r.isDefault ? "取消默认简历" : "设为默认简历"}
                  >
                    <Bookmark
                      className={`size-4 ${
                        r.isDefault
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                  <Link
                    href={`/resumes/${r.id}`}
                    onClick={(ev) => ev.stopPropagation()}
                    className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <Pencil className="size-4 text-muted-foreground" />
                  </Link>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      deleteResume(r.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="size-4 text-red-400" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
