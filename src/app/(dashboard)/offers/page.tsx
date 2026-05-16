"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import {
  Plus,
  FileCheck,
  Trash2,
  Loader2,
  Sparkles,
  TrendingUp,
  Banknote,
  History,
  Clock,
  Scale,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  PENDING: "待回复",
  ACCEPTED: "已接受",
  REJECTED: "已拒绝",
  EXPIRED: "已过期",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  ACCEPTED: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  REJECTED: "bg-red-400/10 text-red-400 border-red-400/20",
  EXPIRED: "bg-neutral-400/10 text-neutral-400 border-neutral-400/20",
};

interface OfferData {
  id: string;
  company: string;
  title: string;
  salary: number;
  salaryMonth: number;
  benefits: string | null;
  status: string;
  notes: string | null;
  receivedAt: string;
  job: { company: string; title: string };
}

interface JobOption {
  id: string;
  company: string;
  title: string;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisCached, setAnalysisCached] = useState(false);

  // Comparison history
  const [historyComparisons, setHistoryComparisons] = useState<any[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Form
  const [jobId, setJobId] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [salaryMonth, setSalaryMonth] = useState("12");
  const [benefits, setBenefits] = useState("");
  const [notes, setNotes] = useState("");

  const fetchOffers = useCallback(async () => {
    const res = await fetch("/api/offers");
    if (res.ok) setOffers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOffers();
    fetch("/api/jobs").then((r) => { if (r.ok) r.json().then(setJobs); });
  }, [fetchOffers]);

  function onJobSelect(val: string) {
    setJobId(val);
    const job = jobs.find((j) => j.id === val);
    if (job) {
      setCompany(job.company);
      setTitle(job.title);
    }
  }

  async function createOffer() {
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        company,
        title,
        salary: parseInt(salary),
        salaryMonth: parseInt(salaryMonth),
        benefits,
        notes,
      }),
    });

    if (res.ok) {
      toast.success("Offer 已添加");
      setShowNew(false);
      setJobId("");
      setSalary("");
      setBenefits("");
      setNotes("");
      fetchOffers();
    } else {
      const err = await res.json();
      toast.error(err.error || "添加失败");
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/offers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOffers();
  }

  async function deleteOffer(id: string) {
    if (!confirm("确定删除？")) return;
    await fetch(`/api/offers/${id}`, { method: "DELETE" });
    toast.success("已删除");
    fetchOffers();
  }

  function toggleSelect(id: string) {
    setSelectedOffers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function compareOffers() {
    const selected = offers.filter((o) => selectedOffers.has(o.id));
    if (selected.length < 2) {
      toast.error("至少选择 2 个 Offer");
      return;
    }
    setAnalyzing(true);
    setAiAnalysis("");
    setAnalysisCached(false);
    try {
      const res = await fetch("/api/offers/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offers: selected }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "对比分析失败");
        setAnalyzing(false);
        return;
      }

      // Check if cached (JSON response) or streaming
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.cached) {
          setAiAnalysis(data.result);
          setAnalysisCached(true);
          toast.info("已加载历史对比记录");
        }
        setAnalyzing(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAiAnalysis(text);
      }
    } catch {
      toast.error("分析失败");
    }
    setAnalyzing(false);
  }

  async function fetchHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/offers/comparisons");
      if (res.ok) setHistoryComparisons(await res.json());
    } catch { /* ignore */ }
    setLoadingHistory(false);
  }

  async function viewHistoryComparison(id: string) {
    try {
      const res = await fetch(`/api/offers/comparisons/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAiAnalysis(data.result);
        setAnalysisCached(true);
        setHistoryOpen(false);
      }
    } catch {
      toast.error("加载对比记录失败");
    }
  }

  async function deleteHistoryComparison(id: string) {
    try {
      const res = await fetch(`/api/offers/comparisons/${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistoryComparisons((prev) => prev.filter((c) => c.id !== id));
        toast.success("已删除");
      }
    } catch {
      toast.error("删除失败");
    }
  }

  const totalPackage = (o: OfferData) =>
    (o.salary * o.salaryMonth).toLocaleString();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Offer 管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理收到的 Offer，对比分析
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchHistory} variant="outline" size="sm" className="gap-2 text-xs">
            <History className="size-4" />
            历史对比
          </Button>
          {selectedOffers.size >= 2 && (
            <Button onClick={compareOffers} disabled={analyzing} variant="secondary">
              {analyzing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              AI 对比分析
            </Button>
          )}
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger render={
              <Button>
                <Plus className="size-4 mr-2" />
                添加 Offer
              </Button>
            } />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加 Offer</DialogTitle>
                <DialogDescription>记录收到的录用通知</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>关联岗位</Label>
                  <Select value={jobId} onValueChange={(v) => v && onJobSelect(v)} items={jobs.map((j) => ({ value: j.id, label: `${j.company} - ${j.title}` }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择岗位" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobs.map((j) => (
                        <SelectItem key={j.id} value={j.id} label={`${j.company} - ${j.title}`}>
                          {j.company} - {j.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>公司</Label>
                    <Input value={company} onChange={(e) => setCompany(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>职位</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>月薪（元）</Label>
                    <Input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>月数</Label>
                    <Input type="number" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>福利</Label>
                  <Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} placeholder="五险一金、补充保险、假期..."/>
                </div>
                <div className="space-y-2">
                  <Label>备注</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <Button className="w-full" onClick={createOffer}>
                  添加
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {offers.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <FileCheck className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">还没有 Offer 记录</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {offers.map((o) => (
            <Card
              key={o.id}
              className={`glass border-0 transition-all cursor-pointer ${
                selectedOffers.has(o.id)
                  ? "ring-2 ring-primary/50"
                  : ""
              }`}
              onClick={() => toggleSelect(o.id)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium">{o.title}</h3>
                    <p className="text-sm text-muted-foreground">{o.company}</p>
                  </div>
                  <Badge className={statusColors[o.status]}>
                    {statusLabels[o.status]}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Banknote className="size-3" />
                    {o.salary.toLocaleString()}/月
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="size-3" />
                    {totalPackage(o)}/年
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="size-3" />
                    {new Date(o.receivedAt).toLocaleDateString("zh-CN")}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {o.salaryMonth} 薪
                  </div>
                </div>
                {o.benefits && (
                  <p className="text-xs text-muted-foreground truncate">
                    {o.benefits}
                  </p>
                )}
                <div className="flex items-center gap-1 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-emerald-400"
                    onClick={(e) => { e.stopPropagation(); updateStatus(o.id, "ACCEPTED"); }}
                  >
                    <CheckCircle2 className="size-3 mr-1" />接受
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-red-400"
                    onClick={(e) => { e.stopPropagation(); updateStatus(o.id, "REJECTED"); }}
                  >
                    <XCircle className="size-3 mr-1" />拒绝
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={(e) => { e.stopPropagation(); deleteOffer(o.id); }}
                  >
                    <Trash2 className="size-3 mr-1" />删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* AI Analysis Overlay */}
      {(aiAnalysis || analyzing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-3xl max-h-[85vh] mx-4 flex flex-col border-0 shadow-xl">
            <CardHeader className="pb-3 flex flex-row items-center justify-between shrink-0">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                AI 对比分析
                {analysisCached && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                    历史记录
                  </Badge>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setAiAnalysis(""); setAnalyzing(false); }}>
                关闭
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {analyzing ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <MarkdownMessage content={aiAnalysis} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      {offers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusLabels).map(([k, v]) => {
            const count = offers.filter((o) => o.status === k).length;
            if (!count) return null;
            return (
              <Card key={k} className="glass border-0">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-semibold">{count}</p>
                  <p className="text-xs text-muted-foreground">{v}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-xl max-h-[80vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5 text-sky-400" />
              历史 Offer 对比
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
                        {c.offers?.map((o: any) => `${o.company} - ${o.title}`).join(" vs ") || "对比"}
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
