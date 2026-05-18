"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Compass, Sparkles, Target, Zap, TrendingUp, Search, Maximize2, AlertTriangle, FileDown } from "lucide-react";
import { MarkdownMessage } from "@/components/ui/markdown-message";
import { toast } from "sonner";
import { exportMarkdownToWord } from "@/lib/export-utils";

interface CareerPlan {
  id: string;
  title: string;
  jobId: string | null;
  skillGaps: any;
  roadmap: any;
  progress: any;
  createdAt: string;
  updatedAt: string;
  job?: { company: string; title: string } | null;
}

export default function CareerPage() {
  const [plans, setPlans] = useState<CareerPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [viewPlan, setViewPlan] = useState<CareerPlan | null>(null);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);
  const [hasUnsavedResult, setHasUnsavedResult] = useState(false);
  const [confirmClose, setConfirmClose] = useState<"discard" | "retry" | null>(null);
  const [exportingWord, setExportingWord] = useState(false);

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/career");
    if (res.ok) {
      setPlans(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const analyze = async () => {
    if (!currentRole || !targetRole) return;

    setAnalyzing(true);
    setAnalysisResult("");
    setHasUnsavedResult(false);

    try {
      const res = await fetch("/api/career/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentRole, targetRole, skills, experience }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "分析失败");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          setAnalysisResult(full);
        }
      }
      setHasUnsavedResult(true);
    } catch (e: any) {
      toast.error(e.message || "分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  const savePlan = async () => {
    if (!analysisResult) return;

    setSaving(true);
    try {
      const res = await fetch("/api/career", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${currentRole} → ${targetRole}`,
          skillGaps: { currentRole, targetRole, skills, experience },
          roadmap: { content: analysisResult },
        }),
      });

      if (res.ok) {
        toast.success("规划已保存");
        setHasUnsavedResult(false);
        setAnalyzeOpen(false);
        setAnalysisResult("");
        setCurrentRole("");
        setTargetRole("");
        setSkills("");
        setExperience("");
        fetchPlans();
      }
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (id: string) => {
    const res = await fetch(`/api/career/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
      toast.success("已删除");
    }
  };

  const handleExportWord = async (plan: CareerPlan) => {
    setExportingWord(true);
    try {
      await exportMarkdownToWord(
        (plan.roadmap as any)?.content || "",
        `${plan.title} - 职业规划`
      );
    } catch {
      toast.error("Word 导出失败");
    } finally {
      setExportingWord(false);
    }
  };

  const filteredPlans = plans.filter((p) =>
    search ? p.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">职业规划</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI 驱动的职业路径推荐
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索规划..."
              className="pl-9 bg-white/5 w-48"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setAnalyzeOpen(true)} size="sm" className="gap-2">
            <Plus className="size-4" />
            新建分析
          </Button>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <Compass className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              还没有职业规划，开始你的第一次 AI 职业分析
            </p>
            <Button onClick={() => setAnalyzeOpen(true)} size="sm" className="gap-2">
              <Sparkles className="size-4" />
              开始分析
            </Button>
          </CardContent>
        </Card>
      ) : filteredPlans.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <Search className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">没有匹配的规划</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
              onClick={() => { setViewPlan(plan); setViewPlanOpen(true); }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <TrendingUp className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium">{plan.title}</h3>
                      <div className="flex gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20"
                        >
                          起点: {plan.skillGaps && (plan.skillGaps as any).currentRole}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        >
                          目标: {plan.skillGaps && (plan.skillGaps as any).targetRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        更新于 {new Date(plan.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {plan.roadmap && (plan.roadmap as any).content && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); handleExportWord(plan); }}
                          title="导出 Word"
                        >
                          <FileDown className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); setViewPlan(plan); setViewPlanOpen(true); }}
                        >
                          <Maximize2 className="size-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {plan.roadmap && (plan.roadmap as any).content && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="max-h-64 overflow-y-auto">
                      <MarkdownMessage content={(plan.roadmap as any).content || ""} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Analyze Dialog */}
      <Dialog
        open={analyzeOpen}
        onOpenChange={(open) => {
          if (!open && hasUnsavedResult) {
            setConfirmClose("discard");
          } else {
            setAnalyzeOpen(open);
          }
        }}
      >
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>AI 职业规划分析</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>当前职位</Label>
                <Input
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value)}
                  placeholder="例如：前端开发工程师"
                />
              </div>
              <div className="space-y-2">
                <Label>目标职位</Label>
                <Input
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="例如：高级前端架构师"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>当前技能（逗号分隔）</Label>
              <Input
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="例如：React, TypeScript, Node.js"
              />
            </div>
            <div className="space-y-2">
              <Label>工作经验</Label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="例如：3 年前端开发经验，主要负责中后台系统开发..."
                className="min-h-[80px]"
              />
            </div>

            {!analysisResult && (
              <Button
                onClick={analyze}
                disabled={!currentRole || !targetRole || analyzing}
                className="w-full gap-2"
              >
                {analyzing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                开始分析
              </Button>
            )}

            {analyzing && !analysisResult && (
              <div className="text-center py-8">
                <Loader2 className="size-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  AI 正在分析你的职业路径...
                </p>
              </div>
            )}

            {analysisResult && (
              <>
                <Card className="glass border-0">
                  <CardContent className="p-4">
                    <div className="max-h-[400px] overflow-y-auto">
                      <MarkdownMessage content={analysisResult} />
                    </div>
                  </CardContent>
                </Card>

                {/* Save prompt */}
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-50">
                        是否保存此次职业规划？
                      </p>
                      <p className="text-xs text-amber-400/80 mt-0.5">
                        保存后可随时查看，不保存则关闭后丢失
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmClose("discard")}
                    >
                      放弃
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmClose("retry")}
                    >
                      重试
                    </Button>
                    <Button
                      size="sm"
                      className="flex-[2] gap-2"
                      onClick={savePlan}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Target className="size-4" />
                      )}
                      保存规划
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Close Dialog */}
      <Dialog open={!!confirmClose} onOpenChange={() => setConfirmClose(null)}>
        <DialogContent className="glass border-0 max-w-sm">
          <DialogHeader>
            <DialogTitle>放弃此次分析？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            分析结果尚未保存，此操作不可撤销。
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmClose(null)}>
              继续编辑
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400"
              onClick={() => {
                setConfirmClose(null);
                setHasUnsavedResult(false);
                if (confirmClose === "discard") {
                  setAnalyzeOpen(false);
                }
                setAnalysisResult("");
              }}
            >
              确认放弃
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full View Dialog */}
      <Dialog open={viewPlanOpen} onOpenChange={setViewPlanOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{viewPlan?.title || "职业规划"}</span>
              {viewPlan && (viewPlan.roadmap as any)?.content && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleExportWord(viewPlan)}
                  disabled={exportingWord}
                >
                  {exportingWord ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <FileDown className="size-3.5" />
                  )}
                  <span className="text-xs">导出 Word</span>
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {viewPlan && (
              <>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">
                    起点: {(viewPlan.skillGaps as any)?.currentRole}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    目标: {(viewPlan.skillGaps as any)?.targetRole}
                  </Badge>
                </div>
                <MarkdownMessage content={(viewPlan.roadmap as any)?.content || "暂无内容"} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
