"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { toast } from "sonner";
import { useRef } from "react";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Loader2,
  Eye,
  Pencil,
  Copy,
  FileDown,
} from "lucide-react";

interface Job {
  id: string;
  company: string;
  title: string;
  jd: string;
}

export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<HTMLDivElement>(null);
  const optimizedRef = useRef<HTMLDivElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [linkedJobs, setLinkedJobs] = useState<{ id: string; company: string; title: string }[]>([]);

  useEffect(() => {
    async function load() {
      // Load resume
      const res = await fetch(`/api/resumes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setContent(data.content);
        setLinkedJobs(data.jobResumes?.map((jr: any) => jr.job) || []);
      }

      // Load jobs for context
      const jobsRes = await fetch("/api/jobs");
      if (jobsRes.ok) {
        setJobs(await jobsRes.json());
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const save = useCallback(async () => {
    setSaving(true);
    const res = await fetch(`/api/resumes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, content }),
    });
    if (res.ok) {
      toast.success("已保存");
    } else {
      toast.error("保存失败");
    }
    setSaving(false);
  }, [id, name, content]);

  // Auto-save every 30s
  useEffect(() => {
    const timer = setInterval(save, 30000);
    return () => clearInterval(timer);
  }, [save]);

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [save]);

  async function optimize() {
    if (!content.trim()) {
      toast.error("请先填写简历内容");
      return;
    }

    setOptimizing(true);
    setOptimizedContent("");

    const selectedJob = jobs.find((j) => j.id === selectedJobId);

    try {
      const res = await fetch("/api/resumes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeContent: content,
          jobTitle: selectedJob?.title,
          jobCompany: selectedJob?.company,
          jd: selectedJob?.jd,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "优化失败");
        setOptimizing(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        toast.error("无法读取响应流");
        setOptimizing(false);
        return;
      }

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setOptimizedContent(accumulated);
      }

      toast.success("优化完成！");

      // 如果选择了具体岗位，自动绑定
      if (selectedJob && selectedJob.id !== "0") {
        const bindRes = await fetch(`/api/resumes/${id}/bind`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: selectedJob.id }),
        });
        if (bindRes.ok) {
          setLinkedJobs((prev) => {
            const exists = prev.some((j) => j.id === selectedJob.id);
            if (exists) return prev;
            return [...prev, { id: selectedJob.id, company: selectedJob.company, title: selectedJob.title }];
          });
        }
      }
    } catch {
      toast.error("优化失败");
    }
    setOptimizing(false);
  }

  function applyOptimized() {
    setContent(optimizedContent);
    setOptimizedContent("");
    toast.success("已应用优化版本");
  }

  function exportPdf(source: "preview" | "original" | "optimized") {
    const refMap: Record<string, HTMLDivElement | null> = {
      preview: previewRef.current,
      original: originalRef.current,
      optimized: optimizedRef.current,
    };
    const el = refMap[source];
    if (!el) {
      toast.error("没有可导出的内容");
      return;
    }

    const html = el.innerHTML;
    const doc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:"PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif;color:#1a1a1a;background:#fff;padding:48px 56px;max-width:800px;margin:0 auto;line-height:1.8}
  h1{font-size:22px;font-weight:700;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #0ea5e9}
  h2{font-size:18px;font-weight:700;margin:24px 0 10px;color:#0ea5e9}
  h3{font-size:15px;font-weight:600;margin:18px 0 8px}
  p{font-size:14px;margin:8px 0}
  strong{font-weight:700;color:#111}
  ul,ol{padding-left:20px;margin:8px 0}
  li{font-size:14px;margin:4px 0}
  blockquote{border-left:3px solid #0ea5e9;padding:8px 14px;margin:12px 0;background:#f0f9ff;border-radius:0 6px 6px 0}
  hr{border:none;border-top:1px solid #e5e7eb;margin:20px 0}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  th,td{border:1px solid #d1d5db;padding:8px 12px;text-align:left;font-size:14px}
  th{background:#f9fafb;font-weight:600}
  @media print{body{padding:36px 48px}@page{margin:12mm}}
</style>
</head>
<body>${html}</body>
<script>window.print()</script>
</html>`;

    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/resumes" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="size-4" />
          </Link>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-transparent hover:border-border focus:border-border w-auto min-w-[200px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPreview(!showPreview)}
            className={showPreview ? "text-primary" : ""}
            title={showPreview ? "返回编辑" : "预览简历"}
          >
            {showPreview ? (
              <Pencil className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(content);
              toast.success("已复制到剪贴板");
            }}
            title="复制简历内容"
          >
            <Copy className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const source = optimizedContent ? "optimized" : showPreview ? "preview" : "preview";
              exportPdf(source);
            }}
            title="导出 PDF"
          >
            <FileDown className="size-4" />
          </Button>
          <Button onClick={save} disabled={saving} variant="secondary">
            <Save className="size-4 mr-2" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* Linked Jobs */}
      {linkedJobs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">已关联岗位：</span>
          {linkedJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              {job.company} - {job.title}
            </Link>
          ))}
        </div>
      )}

      {/* Optimize Controls */}
      <Card className="glass border-0">
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">AI 优化：</span>
          <Select
            value={selectedJobId}
            onValueChange={(v) => v && setSelectedJobId(v)}
            items={[
              { value: "0", label: "通用优化" },
              ...jobs.map((j) => ({ value: j.id, label: `${j.company} - ${j.title}` })),
            ]}
          >
            <SelectTrigger className="w-48 bg-white/5">
              <SelectValue placeholder="选择岗位（可选）" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">通用优化</SelectItem>
              {jobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  {j.company} - {j.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={optimize}
            disabled={optimizing || !content.trim()}
            variant="secondary"
          >
            {optimizing ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            优化简历
          </Button>
        </CardContent>
      </Card>

      {/* Comparison Mode (when optimized content exists) */}
      {optimizedContent ? (
        <div className="space-y-4">
          {/* Comparison Toolbar */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              对比模式 — 左：原简历 / 右：AI 优化版本
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportPdf("optimized")} className="gap-1 text-xs">
                <FileDown className="size-3" />
                导出 AI 版本
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportPdf("original")} className="gap-1 text-xs">
                <FileDown className="size-3" />
                导出原简历
              </Button>
              <Button size="sm" onClick={applyOptimized}>
                应用优化版本
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOptimizedContent("")}
              >
                返回编辑
              </Button>
            </div>
          </div>

          {/* Side-by-side comparison */}
          <div className="grid grid-cols-2 gap-4" style={{ height: "calc(100vh - 280px)" }}>
            {/* Original */}
            <Card className="glass border-0 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-medium">原简历</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div ref={originalRef}>
                  <MarkdownMessage content={content || "*暂无内容*"} />
                </div>
              </CardContent>
            </Card>

            {/* Optimized */}
            <Card className="glass border-0 border-primary/20 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="size-3 text-primary" />
                  AI 优化版本
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto">
                <div ref={optimizedRef}>
                  <MarkdownMessage content={optimizedContent} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Normal Editor Mode */
        showPreview ? (
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">简历预览</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-h-[500px]" ref={previewRef}>
                <MarkdownMessage content={content || ""} />
                {!content && (
                  <span className="text-muted-foreground/50">
                    暂无内容，点击右上角铅笔图标返回编辑
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                简历内容（Markdown）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[500px] bg-white/5 font-mono text-sm leading-relaxed resize-y"
                placeholder={`# 个人简介

# 教育经历

# 工作经历

# 项目经验

# 技能`}
              />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
