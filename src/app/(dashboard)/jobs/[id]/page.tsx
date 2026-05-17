"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Star,
  MapPin,
  Link2,
  Pencil,
  Trash2,
  FileText,
  MessageSquare,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Eye,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

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

interface JobDetail {
  id: string;
  company: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remote: boolean;
  prevId?: string | null;
  nextId?: string | null;
  jd: string;
  jdStructured: any;
  status: string;
  sourceUrl: string | null;
  isFavorite: boolean;
  matchScore: number | null;
  jobResumes: any[];
  interviewSessions: any[];
  notes: any[];
  offers: any[];
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPrevId(data.prevId || null);
        setNextId(data.nextId || null);
        setJob(data);
      }
      setLoading(false);
    }
    fetchJob();
  }, [id]);

  async function updateStatus(status: string | null) {
    if (!status) return;
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setJob((prev) => (prev ? { ...prev, status } : prev));
      toast.success("状态已更新");
    }
  }

  async function toggleFavorite() {
    if (!job) return;
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !job.isFavorite }),
    });
    if (res.ok) {
      setJob((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : prev));
    }
  }

  async function handleDelete() {
    if (!confirm("确定删除这个岗位吗？")) return;
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("岗位已删除");
      router.push("/jobs");
    }
  }

  // ── Edit state ──
  const [editOpen, setEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSalaryMin, setEditSalaryMin] = useState("");
  const [editSalaryMax, setEditSalaryMax] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editRemote, setEditRemote] = useState(false);
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editJd, setEditJd] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  function openEditDialog() {
    if (!job) return;
    setEditCompany(job.company);
    setEditTitle(job.title);
    setEditSalaryMin(job.salaryMin ? String(job.salaryMin) : "");
    setEditSalaryMax(job.salaryMax ? String(job.salaryMax) : "");
    setEditLocation(job.location || "");
    setEditRemote(job.remote);
    setEditSourceUrl(job.sourceUrl || "");
    setEditJd(job.jd || "");
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editCompany.trim() || !editTitle.trim() || !editJd.trim()) return;
    setEditSaving(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: editCompany.trim(),
        title: editTitle.trim(),
        salaryMin: editSalaryMin ? parseInt(editSalaryMin) : null,
        salaryMax: editSalaryMax ? parseInt(editSalaryMax) : null,
        location: editLocation.trim() || null,
        remote: editRemote,
        sourceUrl: editSourceUrl.trim() || null,
        jd: editJd.trim(),
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setJob(updated);
      toast.success("岗位信息已更新");
      setEditOpen(false);
    } else {
      const err = await res.json();
      toast.error(err.error || "保存失败");
    }
    setEditSaving(false);
  }

  // ── Resume association state ──
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<any[]>([]);
  const [resumesLoading, setResumesLoading] = useState(false);
  const [viewResume, setViewResume] = useState<any | null>(null);
  const [viewResumeOpen, setViewResumeOpen] = useState(false);

  async function openResumeDialog() {
    setResumeDialogOpen(true);
    setResumesLoading(true);
    const res = await fetch("/api/resumes");
    if (res.ok) {
      setAvailableResumes(await res.json());
    }
    setResumesLoading(false);
  }

  async function linkResume(resumeId: string) {
    const res = await fetch(`/api/jobs/${id}/resumes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId }),
    });
    if (res.ok) {
      const created = await res.json();
      setJob((prev) =>
        prev
          ? { ...prev, jobResumes: [...prev.jobResumes, created] }
          : prev
      );
      toast.success("简历已关联");
    } else {
      const err = await res.json();
      toast.error(err.error || "关联失败");
    }
  }

  async function unlinkResume(resumeId: string) {
    const res = await fetch(`/api/jobs/${id}/resumes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId }),
    });
    if (res.ok) {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              jobResumes: prev.jobResumes.filter((jr: any) => jr.resumeId !== resumeId),
            }
          : prev
      );
      toast.success("已取消关联");
    } else {
      const err = await res.json();
      toast.error(err.error || "操作失败");
    }
  }

  // ── Notes state ──
  const [notes, setNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  async function fetchNotes() {
    if (!job) return;
    setNotesLoading(true);
    const res = await fetch(`/api/notes?jobId=${job.id}`);
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes || data);
      if ((data.notes || data).length > 0 && !selectedNote) {
        setSelectedNote((data.notes || data)[0]);
      }
    }
    setNotesLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [job]);

  async function saveNote() {
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    const method = editingNote ? "PATCH" : "POST";
    const url = editingNote ? `/api/notes/${editingNote.id}` : "/api/notes";
    const body = editingNote
      ? { content: noteContent.trim() }
      : { jobId: job!.id, content: noteContent.trim() };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      toast.success(editingNote ? "笔记已更新" : "笔记已添加");
      setNoteDialogOpen(false);
      setEditingNote(null);
      setNoteContent("");
      await fetchNotes();
      if (!editingNote) {
        setSelectedNote(saved);
      }
    } else {
      toast.error("保存失败");
    }
    setNoteSaving(false);
  }

  async function deleteNote(id: string) {
    if (!confirm("确定删除这条笔记？")) return;
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("笔记已删除");
      if (selectedNote?.id === id) setSelectedNote(null);
      await fetchNotes();
    }
  }

  function openEdit(note: any) {
    setEditingNote(note);
    setNoteContent(note.content);
    setNoteDialogOpen(true);
  }

  function openCreate() {
    setEditingNote(null);
    setNoteContent("");
    setNoteDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">岗位不存在</p>
        <Link href="/jobs" className={cn(buttonVariants({ variant: "ghost" }), "mt-4")}>
          返回列表
        </Link>
      </div>
    );
  }

  const salary = job.salaryMin && job.salaryMax
    ? `${(job.salaryMin / 1000).toFixed(0)}k - ${(job.salaryMax / 1000).toFixed(0)}k`
    : job.salaryMin
      ? `${(job.salaryMin / 1000).toFixed(0)}k 起`
      : job.salaryMax
        ? `最高 ${(job.salaryMax / 1000).toFixed(0)}k`
        : "薪资面议";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/jobs" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{job.title}</h1>
              <button onClick={toggleFavorite}>
                <Star
                  className={`size-4 ${
                    job.isFavorite
                      ? "text-amber-400 fill-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">{job.company}</p>
              {job.sourceUrl && (
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Link2 className="size-3" />
                  {(() => {
                    try {
                      return new URL(job.sourceUrl).hostname;
                    } catch {
                      return "岗位来源";
                    }
                  })()}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={job.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={openEditDialog}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash2 className="size-4 text-red-400" />
          </Button>
        </div>
      </div>

      {/* Prev/Next Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!prevId}
          onClick={() => prevId && router.push(`/jobs/${prevId}`)}
          className="text-xs"
        >
          <ChevronLeft className="size-3.5 mr-1" />
          上一条
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!nextId}
          onClick={() => nextId && router.push(`/jobs/${nextId}`)}
          className="text-xs"
        >
          下一条
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-semibold">{salary}</p>
            <p className="text-xs text-muted-foreground">薪资</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-semibold">{job.location || "未知"}</p>
            <p className="text-xs text-muted-foreground">
              <MapPin className="size-3 inline mr-1" />
              城市{job.remote ? " · 远程" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-semibold">
              <Badge className={statusColors[job.status]}>
                {statusLabels[job.status]}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">状态</p>
          </CardContent>
        </Card>
        <Card className="glass border-0">
          <CardContent className="p-4 text-center">
            <p className="text-lg font-semibold">
              {job.matchScore ? `${job.matchScore}%` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">匹配度</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={openResumeDialog} className="gap-1">
          <FileText className="size-3" />
          关联简历（{job.jobResumes.length}）
        </Button>
        <Link href={`/interviews?jobId=${job.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <MessageSquare className="size-3 mr-2" />
          面试记录（{job.interviewSessions.length}）
        </Link>
      </div>

      {/* JD */}
      <Card className="glass border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">岗位描述（JD）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
            {job.jd}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      {job.jdStructured && (
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">AI 分析结果</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(job.jdStructured, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      <Card className="glass border-0 overflow-hidden">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <StickyNote className="size-4" />
              岗位笔记
              {notes.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({notes.length})
                </span>
              )}
            </CardTitle>
            <Button onClick={openCreate} size="sm" className="gap-1">
              <Plus className="size-3" />
              新增笔记
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {notesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              暂无笔记
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-border">
              {/* Note List */}
              <div className="flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto max-h-[400px]">
                  {notes.map((note: any) => (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className={`w-full text-left p-3 border-b border-border/50 transition-colors ${
                        selectedNote?.id === note.id
                          ? "bg-primary/10"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <p className="text-xs leading-relaxed line-clamp-2 text-muted-foreground">
                        {note.content
                          ? note.content.slice(0, 80).replace(/\n/g, " ")
                          : "空笔记"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(note.updatedAt).toLocaleString("zh-CN")}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Detail */}
              <div className="flex flex-col min-h-[300px]">
                {selectedNote ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(selectedNote.updatedAt).toLocaleString("zh-CN")}
                      </p>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(selectedNote)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-red-400"
                          onClick={() => deleteNote(selectedNote.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedNote.content || "空笔记"}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      选择左侧笔记查看详情
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume Browser Dialog */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>关联简历</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Currently linked resumes */}
            {job.jobResumes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">已关联的简历</Label>
                {job.jobResumes.map((jr: any) => (
                  <div
                    key={jr.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {jr.resume?.name || "未命名简历"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {jr.resume?.content?.slice(0, 60) || "空内容"}...
                      </p>
                      {jr.optimizedContent && (
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          已优化
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          setViewResume(jr.resume);
                          setViewResumeOpen(true);
                        }}
                      >
                        <Eye className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-400"
                        onClick={() => unlinkResume(jr.resumeId)}
                      >
                        <Unlink className="size-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Available resumes to link */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                {job.jobResumes.length > 0 ? "可关联的简历" : "选择要关联的简历"}
              </Label>
              {resumesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
              ) : availableResumes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无可关联的简历
                </p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {availableResumes
                    .filter(
                      (r) => !job.jobResumes.some((jr: any) => jr.resumeId === r.id)
                    )
                    .map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {r.content?.slice(0, 60) || "空内容"}...
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 ml-2 gap-1 text-xs"
                          onClick={() => linkResume(r.id)}
                        >
                          <Plus className="size-3" />
                          关联
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resume View Dialog */}
      <Dialog open={viewResumeOpen} onOpenChange={setViewResumeOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewResume?.name || "简历详情"}</DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {viewResume?.content || "空内容"}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Job Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑岗位信息</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>公司名称 *</Label>
                <Input
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="bg-white/5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>职位名称 *</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-white/5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>最低月薪</Label>
                <Input
                  type="number"
                  value={editSalaryMin}
                  onChange={(e) => setEditSalaryMin(e.target.value)}
                  placeholder="例：15000"
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>最高月薪</Label>
                <Input
                  type="number"
                  value={editSalaryMax}
                  onChange={(e) => setEditSalaryMax(e.target.value)}
                  placeholder="例：25000"
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>工作城市</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="例：北京"
                  className="bg-white/5"
                />
              </div>
              <div className="space-y-2">
                <Label>来源链接</Label>
                <Input
                  type="url"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  placeholder="岗位链接"
                  className="bg-white/5"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 col-span-2">
                <Label className="cursor-pointer">远程工作</Label>
                <Switch
                  checked={editRemote}
                  onCheckedChange={setEditRemote}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>岗位描述（JD）*</Label>
              <Textarea
                value={editJd}
                onChange={(e) => setEditJd(e.target.value)}
                className="min-h-[150px] resize-y"
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button
                onClick={saveEdit}
                disabled={!editCompany.trim() || !editTitle.trim() || !editJd.trim() || editSaving}
              >
                {editSaving ? (
                  <Loader2 className="size-4 animate-spin mr-2" />
                ) : null}
                保存修改
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Create/Edit Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? "编辑笔记" : "新增笔记"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="输入笔记内容..."
                className="min-h-[200px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setNoteDialogOpen(false);
                  setEditingNote(null);
                  setNoteContent("");
                }}
              >
                取消
              </Button>
              <Button
                onClick={saveNote}
                disabled={!noteContent.trim() || noteSaving}
              >
                {noteSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "保存"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
