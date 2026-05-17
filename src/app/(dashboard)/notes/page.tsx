"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, StickyNote, FileText, X, Search } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  jobId: string;
  content: string;
  updatedAt: string;
  job: { company: string; title: string };
}

interface Job {
  id: string;
  company: string;
  title: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newJobId, setNewJobId] = useState("");

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    const res = await fetch(`/api/notes?${params}`);
    if (res.ok) setNotes(await res.json());
    setLoading(false);
  }, [searchQuery]);

  useEffect(() => {
    fetchNotes();
    fetch("/api/jobs")
      .then((r) => r.ok && r.json())
      .then((data) => data && setJobs(data));
  }, [fetchNotes]);

  const autoSave = useCallback(
    async (noteId: string, newContent: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        const res = await fetch(`/api/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
        if (res.ok) {
          setLastSaved(new Date());
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteId ? { ...n, content: newContent } : n
            )
          );
        }
        setSaving(false);
      }, 1500);
    },
    []
  );

  const handleContentChange = (value: string) => {
    setContent(value);
    if (activeNote) autoSave(activeNote.id, value);
  };

  const openDetail = (note: Note) => {
    setActiveNote(note);
    setContent(note.content);
    setLastSaved(null);
    setDetailOpen(true);
  };

  const createNote = async () => {
    if (!newJobId) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: newJobId, content: "" }),
    });
    if (res.ok) {
      const data = await res.json();
      setNotes((prev) => [data, ...prev]);
      setCreateOpen(false);
      toast.success("笔记已创建");
      openDetail(data);
    }
  };

  const deleteNote = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (activeNote?.id === id) {
        setDetailOpen(false);
        setActiveNote(null);
        setContent("");
      }
      toast.success("已删除");
    }
  };

  // Group notes by job
  const grouped = notes.reduce(
    (acc, note) => {
      const key = note.jobId;
      if (!acc[key]) acc[key] = { job: note.job, notes: [] };
      acc[key].notes.push(note);
      return acc;
    },
    {} as Record<string, { job: Note["job"]; notes: Note[] }>
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">岗位笔记</h1>
          <p className="text-sm text-muted-foreground mt-1">
            记录求职过程中的思考和备忘
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          新建笔记
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索笔记内容..."
          className="pl-9 h-9 text-sm bg-white/5"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="py-12 text-center">
            <StickyNote className="size-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "没有匹配的笔记" : "还没有笔记，开始记录求职心得"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
                <Plus className="size-4" />
                新建笔记
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([jobId, group]) => (
            <div key={jobId} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <FileText className="size-3.5 text-muted-foreground" />
                <h3 className="text-sm font-medium">
                  {group.job.title} @ {group.job.company}
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({group.notes.length})
                </span>
              </div>
              <div className="grid gap-2">
                {group.notes.map((note) => (
                  <Card
                    key={note.id}
                    className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => openDetail(note)}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {note.content
                          ? note.content.slice(0, 120).replace(/\n/g, " ")
                          : "空笔记"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {new Date(note.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="glass border-0 max-w-[calc(100%-2rem)] sm:max-w-3xl h-[80vh] flex flex-col"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between">
            <DialogHeader className="p-0">
              <DialogTitle className="text-sm flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                {activeNote?.job.title} @ {activeNote?.job.company}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-1">
              {saving && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mr-2">
                  <Loader2 className="size-3 animate-spin" />
                  保存中...
                </span>
              )}
              {lastSaved && !saving && (
                <span className="text-[10px] text-muted-foreground mr-2">
                  已保存 {lastSaved.toLocaleTimeString("zh-CN")}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-red-400"
                onClick={() => {
                  if (activeNote) deleteNote(activeNote.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                onClick={() => setDetailOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="开始记录你的想法..."
            className="flex-1 min-h-0 border-0 rounded-none resize-none bg-transparent px-0 py-4 text-sm leading-relaxed focus-visible:ring-0"
          />
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>新建笔记</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>关联岗位</Label>
              <Select value={newJobId} onValueChange={(v) => v && setNewJobId(v)} items={jobs.map((j) => ({ value: j.id, label: `${j.title} @ ${j.company}` }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择岗位" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} label={`${job.title} @ ${job.company}`}>
                      {job.title} @ {job.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={createNote} disabled={!newJobId} className="w-full gap-2">
              <Plus className="size-4" />
              创建笔记
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
