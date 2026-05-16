"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Search, Star, MapPin, LayoutGrid, List, Upload, Loader2, Trash2, X, CheckSquare, Sparkles, Scale, History, Clock } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/ui/markdown-message";

const statusLabels: Record<string, string> = {
  INTERESTED: "感兴趣",
  APPLIED: "已投递",
  INTERVIEWING: "面试中",
  OFFER: "已 Offer",
  REJECTED: "已拒绝",
};

const statusColors: Record<string, string> = {
  INTERESTED: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  APPLIED: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  INTERVIEWING: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  OFFER: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  REJECTED: "bg-red-400/10 text-red-400 border-red-400/20",
};

interface Job {
  id: string;
  company: string;
  title: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  status: string;
  isFavorite: boolean;
  matchScore: number | null;
  updatedAt: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Batch import
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchJdText, setBatchJdText] = useState("");
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, label: "" });
  const [batchResults, setBatchResults] = useState<{ done: number; fail: number } | null>(null);

  // Batch delete
  const [selectionMode, setSelectionMode] = useState<null | "compare" | "delete">(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Job comparison
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState("");
  const [comparisonCached, setComparisonCached] = useState(false);

  // Comparison history
  const [historyComparisons, setHistoryComparisons] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/jobs?${params}`);
    if (res.ok) {
      const data = await res.json();
      setJobs(data);
    }
    setLoading(false);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function toggleFavorite(job: Job) {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !job.isFavorite }),
    });
    if (res.ok) fetchJobs();
  }

  async function handleBatchImport() {
    if (batchJdText.trim().length < 10) {
      toast.error("请输入至少一条岗位描述");
      return;
    }
    setBatchImporting(true);
    setBatchResults(null);
    try {
      // Split by "---" or double newlines
      const jdTexts = batchJdText
        .split(/---+/)
        .flatMap((chunk) => chunk.split(/\n\n\n+/))
        .map((s) => s.trim())
        .filter((s) => s.length >= 10);

      if (jdTexts.length === 0) {
        toast.error("没有有效的岗位描述（每条至少10个字符）");
        setBatchImporting(false);
        return;
      }

      const parseRes = await fetch("/api/jobs/batch-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jdTexts }),
      });

      if (!parseRes.ok) {
        const err = await parseRes.json();
        throw new Error(err.error || "解析失败");
      }

      const text = await parseRes.text();
      const lines = text.trim().split("\n").filter(Boolean);
      let done = 0;
      let fail = 0;
      setBatchProgress({ current: 0, total: lines.length, label: "正在解析岗位..." });

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.error || !parsed.company || !parsed.title) {
            fail++;
            setBatchProgress((prev) => ({ ...prev, current: prev.current + 1, label: "解析失败，跳过..." }));
            continue;
          }
          setBatchProgress((prev) => ({ ...prev, label: `正在导入: ${parsed.company} - ${parsed.title}` }));
          const createRes = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              company: parsed.company === "未知公司" ? "未知公司" : parsed.company,
              title: parsed.title === "未知职位" ? "未知职位" : parsed.title,
              salaryMin: parsed.salaryMin ?? null,
              salaryMax: parsed.salaryMax ?? null,
              location: parsed.location ?? null,
              remote: parsed.remote ?? false,
              jd: parsed.rawJd || "",
              status: "INTERESTED",
            }),
          });
          if (createRes.ok) {
            done++;
          } else {
            fail++;
          }
        } catch {
          fail++;
        }
        setBatchProgress((prev) => ({ ...prev, current: prev.current + 1 }));
      }
      setBatchResults({ done, fail });
      if (done > 0) {
        toast.success(`成功导入 ${done} 个岗位${fail > 0 ? `，${fail} 个失败` : ""}`);
        fetchJobs();
      } else {
        toast.error("导入失败，请检查岗位描述格式");
      }
    } catch (e: any) {
      toast.error(e.message || "批量导入失败");
    } finally {
      setBatchImporting(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  }

  async function batchDelete() {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`已删除 ${data.deleted} 个岗位`);
        setSelectedIds(new Set());
        setSelectionMode(null);
        fetchJobs();
      } else {
        const err = await res.json();
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("批量删除失败");
    } finally {
      setBatchDeleting(false);
    }
  }

  async function handleCompare() {
    if (selectedIds.size < 2) {
      toast.error("请至少选择 2 个岗位进行对比");
      return;
    }
    setCompareOpen(true);
    setComparing(true);
    setComparisonResult("");
    setComparisonCached(false);

    try {
      const res = await fetch("/api/jobs/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "对比分析失败");
        setComparing(false);
        return;
      }

      // Check if cached (JSON response) or streaming
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.cached) {
          setComparisonResult(data.result);
          setComparisonCached(true);
          toast.info("已加载历史对比记录");
        }
        setComparing(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setComparing(false);
        return;
      }

      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setComparisonResult(full);
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setComparing(false);
    }
  }

  async function fetchHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/jobs/comparisons");
      if (res.ok) setHistoryComparisons(await res.json());
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }

  async function viewHistoryComparison(id: string) {
    try {
      const res = await fetch(`/api/jobs/comparisons/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCompareOpen(true);
        setComparisonResult(data.result);
        setComparisonCached(true);
        setHistoryOpen(false);
      }
    } catch {
      toast.error("加载对比记录失败");
    }
  }

  async function deleteHistoryComparison(id: string) {
    try {
      const res = await fetch(`/api/jobs/comparisons/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryComparisons((prev) => prev.filter((c) => c.id !== id));
        toast.success("已删除");
      }
    } catch {
      toast.error("删除失败");
    }
  }

  function formatSalary(min: number | null, max: number | null) {
    if (!min && !max) return null;
    if (min && max) return `${(min / 1000).toFixed(0)}k-${(max / 1000).toFixed(0)}k`;
    if (min) return `${(min / 1000).toFixed(0)}k起`;
    if (max) return `最高${(max / 1000).toFixed(0)}k`;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">岗位管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的求职岗位，追踪全流程
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button variant="outline" size="sm" onClick={selectAll} className="gap-1 text-xs">
                <CheckSquare className="size-3" />
                {selectedIds.size === jobs.length ? "取消全选" : "全选"}
              </Button>
              {selectionMode === "compare" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompare}
                  disabled={selectedIds.size < 2}
                  className="gap-1 text-xs text-sky-400 hover:text-sky-400"
                >
                  <Scale className="size-3" />
                  AI 对比 ({selectedIds.size})
                </Button>
              )}
              {selectionMode === "delete" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={batchDelete}
                  disabled={selectedIds.size === 0 || batchDeleting}
                  className="gap-1 text-xs text-red-400 hover:text-red-400"
                >
                  {batchDeleting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  删除 ({selectedIds.size})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSelectionMode(null); setSelectedIds(new Set()); }} className="gap-1 text-xs">
                <X className="size-3" />
                取消
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => { setBatchOpen(true); setBatchJdText(""); setBatchResults(null); setBatchProgress({ current: 0, total: 0, label: "" }); }} className="gap-2 text-xs">
                <Upload className="size-4" />
                批量导入
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectionMode("compare"); setSelectedIds(new Set()); }} className="gap-2 text-xs">
                <Scale className="size-4" />
                AI 对比
              </Button>
              <Button variant="outline" size="sm" onClick={fetchHistory} className="gap-2 text-xs">
                <History className="size-4" />
                历史对比
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectionMode("delete"); setSelectedIds(new Set()); }} className="gap-2 text-xs">
                <Trash2 className="size-4" />
                批量删除
              </Button>
              <Link href="/jobs/new" className={cn(buttonVariants())}>
                <Plus className="size-4 mr-2" />
                添加岗位
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索岗位..."
            className="pl-9 bg-white/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-28 bg-white/5">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() =>
            setViewMode(viewMode === "card" ? "list" : "card")
          }
        >
          {viewMode === "card" ? (
            <List className="size-4" />
          ) : (
            <LayoutGrid className="size-4" />
          )}
        </Button>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass border-0 animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search || statusFilter !== "all"
                ? "没有匹配的岗位"
                : "还没有岗位，开始添加吧"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={`glass border-0 transition-all duration-200 cursor-pointer group ${
                selectionMode && selectedIds.has(job.id)
                  ? "ring-2 ring-primary"
                  : "hover:bg-white/[0.07]"
              }`}
              onClick={() => {
                if (selectionMode) {
                  toggleSelect(job.id);
                } else {
                  router.push(`/jobs/${job.id}`);
                }
              }}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {selectionMode && (
                      <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selectedIds.has(job.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}>
                        {selectedIds.has(job.id) && (
                          <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {job.company}
                      </p>
                    </div>
                  </div>
                  {!selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(job);
                      }}
                      className="shrink-0"
                    >
                      <Star
                        className={`size-4 transition-colors ${
                          job.isFavorite
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground hover:text-amber-400"
                        }`}
                      />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={statusColors[job.status]}
                  >
                    {statusLabels[job.status]}
                  </Badge>
                  {job.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" />
                      {job.location}
                    </span>
                  )}
                  {formatSalary(job.salaryMin, job.salaryMax) && (
                    <span className="text-xs text-muted-foreground">
                      {formatSalary(job.salaryMin, job.salaryMax)}
                    </span>
                  )}
                  {job.matchScore && (
                    <Badge variant="secondary" className="text-[10px]">
                      匹配 {job.matchScore}%
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={`flex items-center justify-between py-3 px-4 rounded-lg transition-colors cursor-pointer ${
                selectionMode && selectedIds.has(job.id)
                  ? "bg-primary/10 ring-1 ring-primary"
                  : "hover:bg-white/5"
              }`}
              onClick={() => {
                if (selectionMode) {
                  toggleSelect(job.id);
                } else {
                  router.push(`/jobs/${job.id}`);
                }
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {selectionMode ? (
                  <div className={`size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedIds.has(job.id)
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  }`}>
                    {selectedIds.has(job.id) && (
                      <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(job);
                    }}
                  >
                    <Star
                      className={`size-4 transition-colors ${
                        job.isFavorite
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {job.company} — {job.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {job.location && `${job.location} · `}
                    {formatSalary(job.salaryMin, job.salaryMax) || "薪资面议"}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={statusColors[job.status]}>
                {statusLabels[job.status]}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Batch Import Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>批量导入岗位</DialogTitle>
            <DialogDescription>
              粘贴多条岗位描述（JD），用 "---" 或空行分隔，AI 将自动解析并导入
            </DialogDescription>
          </DialogHeader>
          {batchImporting ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-semibold">
                  {batchProgress.label || "正在导入..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  正在处理第 {batchProgress.current}/{batchProgress.total} 个岗位
                </p>
              </div>
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">进度</span>
                  <span className="font-semibold tabular-nums">
                    {batchProgress.total > 0
                      ? `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`
                      : "..."}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300"
                    style={{
                      width: batchProgress.total > 0
                        ? `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                请勿关闭此对话框
              </p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>岗位描述列表</Label>
                <Textarea
                  placeholder={`粘贴多条 JD，用 --- 分隔，例如：

岗位描述1的内容...

---

岗位描述2的内容...

---

岗位描述3的内容...`}
                  className="min-h-[200px] resize-y font-mono text-xs"
                  value={batchJdText}
                  onChange={(e) => setBatchJdText(e.target.value)}
                />
              </div>
              {batchResults && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                  <span className="text-sm font-medium text-emerald-400">
                    成功 {batchResults.done} 个
                  </span>
                  {batchResults.fail > 0 && (
                    <span className="text-sm font-medium text-red-400">
                      失败 {batchResults.fail} 个
                    </span>
                  )}
                </div>
              )}
              <Button
                onClick={handleBatchImport}
                disabled={batchJdText.trim().length < 10}
                className="w-full gap-2"
              >
                <Upload className="size-4" />
                开始批量导入
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Compare Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="size-5 text-sky-400" />
              AI 岗位对比分析
              {comparisonCached && (
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20 ml-2">
                  历史记录
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              正在对比 {selectedIds.size} 个岗位的多维度信息
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {comparing && !comparisonResult ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MarkdownMessage content={comparisonResult} streaming={comparing} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-sky-400" />
              历史岗位对比
            </DialogTitle>
            <DialogDescription>
              点击查看之前的对比分析结果
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyComparisons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">
                暂无历史对比记录
              </p>
            ) : (
              <div className="space-y-2">
                {historyComparisons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    onClick={() => viewHistoryComparison(c.id)}
                  >
                    <Clock className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {c.jobs?.map((j: any) => `${j.company} - ${j.title}`).join(" vs ") || "对比"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("zh-CN", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-red-400 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryComparison(c.id);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
