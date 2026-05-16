"use client";

import { useState, useEffect } from "react";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Loader2, BookOpen, Sparkles, MapPin, CheckCircle2, Clock, ArrowRight, Save, FileCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  company: string;
  title: string;
  onboardingContent?: string | null;
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
      // Load previously saved onboarding content
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

  // Parse weeks from markdown result for progress tracking
  const weeks = result
    ? result
        .split(/^##?\s*第\d+周/m)
        .filter(Boolean)
        .map((w, i) => ({ week: i + 1, content: w.trim() }))
    : [];

  const totalItems = weeks.length;
  const completedItems = weeks.filter((_, i) => progress[`week-${i + 1}`]).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">入职技能指导</h1>
        <p className="text-sm text-muted-foreground mt-1">
          岗位技能学习和成长路线
        </p>
      </div>

      <Card className="glass border-0">
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>选择岗位</Label>
              <Select
                value={selectedJobId}
                onValueChange={(v) => v && setSelectedJobId(v)}
                disabled={loading}
                items={jobs.map((j) => ({ value: j.id, label: `${j.title} @ ${j.company}` }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择一个已投递的岗位" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} label={`${job.title} @ ${job.company}${job.onboardingContent ? " ✓" : ""}`}>
                      <span className="flex items-center gap-2">
                        <span>{job.title} @ {job.company}</span>
                        {job.onboardingContent && (
                          <FileCheck className="size-3 text-emerald-400 shrink-0" />
                        )}
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

      {!loading && jobs.length === 0 && !result && (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <BookOpen className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              暂无可分析的岗位，请先添加岗位
            </p>
          </CardContent>
        </Card>
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
    </div>
  );
}
