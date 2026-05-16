"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Plus, Trash2, MessagesSquare, Sparkles, User, Bot, Search, FilterX } from "lucide-react";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/ui/markdown-message";

interface InterviewSession {
  id: string;
  jobId: string | null;
  type: string;
  messages: { role: string; content: string }[];
  feedback: string | null;
  createdAt: string;
  job?: { company: string; title: string } | null;
}

interface Job {
  id: string;
  company: string;
  title: string;
}

const typeLabels: Record<string, string> = {
  TECHNICAL: "技术面",
  HR: "HR 面",
  BEHAVIORAL: "行为面",
};

const typeColors: Record<string, string> = {
  TECHNICAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  HR: "bg-green-500/10 text-green-400 border-green-500/20",
  BEHAVIORAL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function InterviewsPageInner() {
  const searchParams = useSearchParams();
  const urlJobId = searchParams.get("jobId") || "";

  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState("TECHNICAL");
  const [newJobId, setNewJobId] = useState("");
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState("");

  // Filters
  const [filterJobId, setFilterJobId] = useState(urlJobId);
  const [filterCompany, setFilterCompany] = useState("");

  const fetchSessions = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterJobId) params.set("jobId", filterJobId);

    const res = await fetch(`/api/interviews?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data);
    }
    setLoading(false);
  }, [filterJobId]);

  const fetchJobs = async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) {
      const data = await res.json();
      setJobs(data);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchJobs();
  }, [fetchSessions]);

  // Sync filterJobId from URL
  useEffect(() => {
    setFilterJobId(urlJobId);
  }, [urlJobId]);

  // Client-side company filter
  const filteredSessions = useMemo(() => {
    if (!filterCompany) return sessions;
    return sessions.filter(
      (s) =>
        s.job?.company.toLowerCase().includes(filterCompany.toLowerCase())
    );
  }, [sessions, filterCompany]);

  const createSession = async () => {
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, jobId: newJobId || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setSessions((prev) => [data, ...prev]);
      setCreateOpen(false);
      setActiveSession(data);
      toast.success("面试会话已创建");
    }
  };

  const deleteSession = async (id: string) => {
    const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSession?.id === id) setActiveSession(null);
      toast.success("已删除");
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !activeSession || sending) return;

    const userMessage = message.trim();
    setMessage("");
    setSending(true);
    setStreaming("");

    const updatedMessages = [
      ...(activeSession.messages || []),
      { role: "user", content: userMessage },
    ];
    setActiveSession({
      ...activeSession,
      messages: updatedMessages,
    });

    try {
      const res = await fetch("/api/interviews/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: userMessage,
          jobId: activeSession.jobId,
          type: activeSession.type,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "AI 请求失败");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value, { stream: true });
          setStreaming(fullResponse);
        }
      }

      const newMessages = [
        ...updatedMessages,
        { role: "assistant", content: fullResponse },
      ];

      const patchRes = await fetch(`/api/interviews/${activeSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (patchRes.ok) {
        const updated = await patchRes.json();
        setActiveSession(updated);
        setSessions((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s))
        );
      }
    } catch (e: any) {
      toast.error(e.message || "发送失败");
    } finally {
      setSending(false);
      setStreaming("");
    }
  };

  const openSession = async (session: InterviewSession) => {
    const res = await fetch(`/api/interviews/${session.id}`);
    if (res.ok) {
      setActiveSession(await res.json());
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">面试指导</h1>
          <p className="text-sm text-muted-foreground mt-1">AI 模拟面试练习</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          新建面试
        </Button>
      </div>

      {/* Filters */}
      {!activeSession && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={filterJobId} onValueChange={(v) => { setFilterJobId(v || ""); }} items={[{ value: "", label: "全部岗位" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title} @ ${j.company}` }))]}>
            <SelectTrigger className="w-48 bg-white/5">
              <SelectValue placeholder="按岗位筛选" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部岗位</SelectItem>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id} label={`${job.title} @ ${job.company}`}>
                  {job.title} @ {job.company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-36">
            <Search className="size-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="公司名称"
              className="pl-8 h-8 text-xs bg-white/5"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
            />
          </div>
          {(filterJobId || filterCompany) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1 text-muted-foreground"
              onClick={() => {
                setFilterJobId("");
                setFilterCompany("");
              }}
            >
              <FilterX className="size-3" />
              清除筛选
            </Button>
          )}
        </div>
      )}

      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 h-[calc(100vh-12rem)]">
          {/* Chat Area */}
          <Card className="glass border-0 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSession(null)}
              >
                ← 返回
              </Button>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {activeSession.job
                    ? `${activeSession.job.title} @ ${activeSession.job.company}`
                    : "通用面试练习"}
                </p>
                <Badge
                  variant="outline"
                  className={typeColors[activeSession.type] || ""}
                >
                  {typeLabels[activeSession.type] || activeSession.type}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-red-400"
                onClick={() => deleteSession(activeSession.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {activeSession.messages?.length === 0 && (
                  <div className="text-center py-12">
                    <Sparkles className="size-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      面试官已就位，请开始你的自我介绍
                    </p>
                  </div>
                )}
                {(activeSession.messages || []).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "justify-end" : ""
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          <Bot className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      <MarkdownMessage content={msg.content} />
                    </div>
                    {msg.role === "user" && (
                      <Avatar className="size-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-white/10 text-[10px]">
                          <User className="size-3" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {streaming && (
                  <div className="flex gap-3">
                    <Avatar className="size-7 shrink-0 mt-0.5">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        <Bot className="size-3" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm bg-white/5 border border-white/10">
                      <MarkdownMessage content={streaming} streaming />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border shrink-0">
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="输入你的回答... (Enter 发送, Shift+Enter 换行)"
                  className="min-h-[44px] max-h-32 resize-none"
                  disabled={sending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || sending}
                  size="icon"
                  className="shrink-0 size-11"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Info Panel */}
          <Card className="glass border-0 p-4 space-y-4 hidden lg:block">
            <h3 className="text-sm font-medium">面试信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">类型</span>
                <Badge
                  variant="outline"
                  className={typeColors[activeSession.type] || ""}
                >
                  {typeLabels[activeSession.type] || activeSession.type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">轮数</span>
                <span>{Math.ceil((activeSession.messages?.length || 0) / 2)}</span>
              </div>
              {activeSession.job && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联岗位</span>
                  <span>
                    {activeSession.job.title} @ {activeSession.job.company}
                  </span>
                </div>
              )}
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                面试官会根据你的回答实时评估，并在每轮给出评分。最后一轮会给出综合评价。
              </p>
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <Card className="glass border-0">
              <CardContent className="py-12 text-center">
                <MessagesSquare className="size-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">
                  {sessions.length === 0
                    ? "还没有面试记录，开始你的第一次 AI 模拟面试"
                    : "没有匹配的面试记录"}
                </p>
                <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
                  <Plus className="size-4" />
                  新建面试
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredSessions.map((s) => (
                <Card
                  key={s.id}
                  className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
                  onClick={() => openSession(s)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MessagesSquare className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {s.job
                            ? `${s.job.title} @ ${s.job.company}`
                            : "通用面试练习"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {s.messages && Array.isArray(s.messages)
                            ? `${Math.ceil(s.messages.length / 2)} 轮对话`
                            : "0 轮对话"}{" "}
                          ·{" "}
                          {new Date(s.createdAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant="outline"
                        className={typeColors[s.type] || ""}
                      >
                        {typeLabels[s.type] || s.type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(s.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>新建面试会话</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>面试类型</Label>
              <Select value={newType} onValueChange={(v) => v && setNewType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TECHNICAL">技术面</SelectItem>
                  <SelectItem value="HR">HR 面</SelectItem>
                  <SelectItem value="BEHAVIORAL">行为面</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联岗位（可选）</Label>
              <Select value={newJobId} onValueChange={(v) => v && setNewJobId(v)} items={[{ value: "", label: "通用面试（不限岗位）" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title} @ ${j.company}` }))]}>
                <SelectTrigger>
                  <SelectValue placeholder="通用面试（不限岗位）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">通用面试（不限岗位）</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} label={`${job.title} @ ${job.company}`}>
                      {job.title} @ {job.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createSession} className="w-full gap-2">
              <Sparkles className="size-4" />
              开始面试
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InterviewsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>}>
      <InterviewsPageInner />
    </Suspense>
  );
}
