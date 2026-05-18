"use client";

import { useState, useEffect } from "react";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Save,
  FileCheck,
  AlertTriangle,
  FileText,
  FileDown,
  Eye,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { exportMarkdownToWord, exportMarkdownToPDF } from "@/lib/export-utils";

interface Job {
  id: string;
  company: string;
  title: string;
  onboardingContent?: string | null;
  updatedAt?: string;
}

export default function OnboardingPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");
  const [hasUnsavedResult, setHasUnsavedResult] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [viewJob, setViewJob] = useState<Job | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    fetch("/api/jobs")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setJobs(data);
        setLoading(false);
      });
  }, []);

  // beforeunload guard
  useEffect(() => {
    if (!hasUnsavedResult) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedResult]);

  const refreshJobs = async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data);
    }
  };

  const saveRoadmap = async () => {
    if (!selectedJobId || !result) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/jobs/${selectedJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingContent: result }),
      });
      if (res.ok) {
        setHasUnsavedResult(false);
        toast.success("学习路线已保存");
        refreshJobs();
      } else {
        const err = await res.json();
        throw new Error(err.error || "保存失败");
      }
    } catch (e: any) {
      toast.error(e.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const generateRoadmap = async () => {
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) return;

    setGenerating(true);
    setResult("");
    setHasUnsavedResult(false);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "生成失败");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setResult(full);
        }
      }
      setHasUnsavedResult(true);
    } catch (e: any) {
      toast.error(e.message || "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const toggleProgress = (key: string) => {
    setProgress((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = true;
      }
      localStorage.setItem(
        `onboarding-progress-${selectedJobId}`,
        JSON.stringify(next)
      );
      return next;
    });
  };

  useEffect(() => {
    if (selectedJobId) {
      const saved = localStorage.getItem(
        `onboarding-progress-${selectedJobId}`
      );
      if (saved) {
        try {
          setProgress(JSON.parse(saved));
        } catch {}
      } else {
        setProgress({});
      }
      fetch(`/api/jobs/${selectedJobId}`)
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data?.onboardingContent) {
            setResult(data.onboardingContent);
            setHasUnsavedResult(false);
          } else {
            setResult("");
            setHasUnsavedResult(false);
          }
        });
    }
  }, [selectedJobId]);

  const handleViewJob = (job: Job) => {
    setViewJob(job);
    setViewOpen(true);
    // Load progress for viewing
    const saved = localStorage.getItem(`onboarding-progress-${job.id}`);
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch {
        setProgress({});
      }
    } else {
      setProgress({});
    }
  };

  const handleExportWord = async (content: string, job: Job) => {
    setExportingWord(true);
    try {
      await exportMarkdownToWord(
        content,
        `${job.title}-${job.company}-入职技能指导`
      );
    } catch {
      toast.error("Word 导出失败");
    } finally {
      setExportingWord(false);
    }
  };

  const handleExportPDF = (content: string, job: Job) => {
    setExportingPDF(true);
    try {
      exportMarkdownToPDF(
        content,
        `${job.title} @ ${job.company} - 入职技能指导`
      );
    } catch {
      toast.error("PDF 导出失败");
    } finally {
      setExportingPDF(false);
    }
  };

  // Parse weeks from markdown result for progress tracking
  const parseWeeks = (content: string) =>
    content
      ? content
          .split(/^##?\s*第\d+周/m)
          .filter(Boolean)
          .map((w, i) => ({ week: i + 1, content: w.trim() }))
      : [];

  const weeks = parseWeeks(result);
  const totalItems = weeks.length;
  const completedItems = weeks.filter((_, i) => progress[`week-${i + 1}`]).length;

  const jobsWithContent = jobs.filter((j) => j.onboardingContent);
  const jobsWithoutContent = jobs.filter((j) => !j.onboardingContent);

  // Weeks for view dialog
  const viewContent = viewJob?.onboardingContent || "";
  const viewWeeks = parseWeeks(viewContent);
  const viewCompletedItems = viewWeeks.filter(
    (_, i) => progress[`week-${i + 1}`]
  ).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">入职技能指导</h1>
        <p className="text-sm text-muted-foreground mt-1">
          岗位技能学习和成长路线
        </p>
      </div>

      {/* Generate new guidance */}
      <Card className="glass border-0">
        <CardContent className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Plus className="size-4" />
            生成新的技能指导
          </h2>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>选择岗位</Label>
              <Select
                value={selectedJobId}
                onValueChange={(v) => v && setSelectedJobId(v)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一个已投递的岗位" />
                </SelectTrigger>
                <SelectContent>
                  {jobsWithoutContent.length === 0 && jobsWithContent.length > 0 && (
                    <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                      所有岗位已生成技能指导
                    </div>
                  )}
                  {jobsWithoutContent.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} @ {job.company}
                    </SelectItem>
                  ))}
                  {jobsWithContent
                    .filter((j) => j.id === selectedJobId)
                    .map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <span className="flex items-center gap-2">
                          {job.title} @ {job.company}
                          <FileCheck className="size-3 text-emerald-400" />
                        </span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (hasUnsavedResult) {
                  setConfirmDiscard(true);
                } else {
                  generateRoadmap();
                }
              }}
              disabled={!selectedJobId || generating}
              className="gap-2 shrink-0"
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              生成学习路线
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* P0: Generated guidance list */}
      {!loading && jobsWithContent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileCheck className="size-4 text-emerald-400" />
            已生成的技能指导
          </h2>
          <div className="grid gap-3">
            {jobsWithContent.map((job) => (
              <Card
                key={job.id}
                className="glass border-0 hover:bg-white/5 transition-all cursor-pointer group"
                onClick={() => handleViewJob(job)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <FileCheck className="size-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate">
                          {job.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0"
                        >
                          已生成
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.company}
                        {job.updatedAt &&
                          ` · 更新于 ${new Date(job.updatedAt).toLocaleDateString("zh-CN")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground group-hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewJob(job);
                      }}
                    >
                      <Eye className="size-3.5" />
                      <span className="text-xs">查看详情</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              暂无可分析的岗位，请先添加岗位
            </p>
          </CardContent>
        </Card>
      )}

      {generating && !result && (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              AI 正在分析岗位需求，生成个性化学习路线...
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* P1: Export buttons */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              生成结果预览
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const job = jobs.find((j) => j.id === selectedJobId);
                  if (job) handleExportPDF(result, job);
                }}
                disabled={exportingPDF}
              >
                {exportingPDF ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                <span className="text-xs">导出 PDF</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  const job = jobs.find((j) => j.id === selectedJobId);
                  if (job) handleExportWord(result, job);
                }}
                disabled={exportingWord}
              >
                {exportingWord ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileDown className="size-3.5" />
                )}
                <span className="text-xs">导出 Word</span>
              </Button>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass border-0">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold">{totalItems}</p>
                <p className="text-xs text-muted-foreground">总阶段</p>
              </CardContent>
            </Card>
            <Card className="glass border-0">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-400">
                  {completedItems}
                </p>
                <p className="text-xs text-muted-foreground">已完成</p>
              </CardContent>
            </Card>
            <Card className="glass border-0">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-primary">
                  {totalItems > 0
                    ? Math.round((completedItems / totalItems) * 100)
                    : 0}
                  %
                </p>
                <p className="text-xs text-muted-foreground">完成率</p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <div className="relative pl-8 space-y-0">
            <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />
            {weeks.map((week, i) => (
              <div key={i} className="relative pb-8 last:pb-0">
                <button
                  onClick={() => toggleProgress(`week-${i + 1}`)}
                  className={`absolute -left-[21px] top-1 size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                    progress[`week-${i + 1}`]
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-background border-border hover:border-primary"
                  }`}
                >
                  {progress[`week-${i + 1}`] ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <Clock className="size-3 text-muted-foreground" />
                  )}
                </button>
                <Card
                  className={`glass border-0 transition-all ${
                    progress[`week-${i + 1}`] ? "opacity-60" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <span className="size-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      第 {i + 1} 周
                    </h3>
                    <MarkdownMessage content={week.content} />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Blocking save prompt */}
      <Dialog open={hasUnsavedResult} onOpenChange={() => setConfirmDiscard(true)}>
        <DialogContent className="glass border-0 max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-400" />
              是否保存此次学习路线？
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            学习路线已生成，保存后可随时查看进度。不保存将丢失当前内容。
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDiscard(true)}
            >
              放弃
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={saveRoadmap}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              保存路线
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discard secondary confirm */}
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent className="glass border-0 max-w-sm">
          <DialogHeader>
            <DialogTitle>确认放弃？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            学习路线尚未保存，此操作不可撤销。
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDiscard(false)}>
              取消
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400"
              onClick={() => {
                setConfirmDiscard(false);
                setHasUnsavedResult(false);
                setResult("");
              }}
            >
              确认放弃
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* P0: View detail dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="size-5 text-emerald-400" />
              {viewJob?.title} @ {viewJob?.company} - 入职技能指导
            </DialogTitle>
          </DialogHeader>

          {viewJob && viewContent && (
            <div className="space-y-6 pt-2">
              {/* P1: Export buttons in detail view */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExportPDF(viewContent, viewJob)}
                >
                  <FileText className="size-3.5" />
                  <span className="text-xs">导出 PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExportWord(viewContent, viewJob)}
                >
                  <FileDown className="size-3.5" />
                  <span className="text-xs">导出 Word</span>
                </Button>
              </div>

              {/* Progress Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold">{viewWeeks.length}</p>
                    <p className="text-xs text-muted-foreground">总阶段</p>
                  </CardContent>
                </Card>
                <Card className="glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold text-emerald-400">
                      {viewCompletedItems}
                    </p>
                    <p className="text-xs text-muted-foreground">已完成</p>
                  </CardContent>
                </Card>
                <Card className="glass border-0">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-semibold text-primary">
                      {viewWeeks.length > 0
                        ? Math.round((viewCompletedItems / viewWeeks.length) * 100)
                        : 0}
                      %
                    </p>
                    <p className="text-xs text-muted-foreground">完成率</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline in detail view */}
              <div className="relative pl-8 space-y-0">
                <div className="absolute left-[11px] top-4 bottom-4 w-px bg-border" />
                {viewWeeks.map((week, i) => (
                  <div key={i} className="relative pb-8 last:pb-0">
                    <button
                      onClick={() => {
                        const key = `week-${i + 1}`;
                        setProgress((prev) => {
                          const next = { ...prev };
                          if (next[key]) {
                            delete next[key];
                          } else {
                            next[key] = true;
                          }
                          localStorage.setItem(
                            `onboarding-progress-${viewJob.id}`,
                            JSON.stringify(next)
                          );
                          return next;
                        });
                      }}
                      className={`absolute -left-[21px] top-1 size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                        progress[`week-${i + 1}`]
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {progress[`week-${i + 1}`] ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Clock className="size-3 text-muted-foreground" />
                      )}
                    </button>
                    <Card
                      className={`glass border-0 transition-all ${
                        progress[`week-${i + 1}`] ? "opacity-60" : ""
                      }`}
                    >
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <span className="size-5 rounded bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          第 {i + 1} 周
                        </h3>
                        <MarkdownMessage content={week.content} />
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
