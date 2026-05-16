"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Briefcase,
  Bell,
  CalendarPlus,
} from "lucide-react";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startAt: string;
  endAt: string;
  jobId: string | null;
}

interface Job {
  id: string;
  company: string;
  title: string;
}

const eventTypeLabels: Record<string, string> = {
  INTERVIEW: "面试",
  DEADLINE: "截止日期",
  REMINDER: "提醒",
  CUSTOM: "自定义",
};

const eventTypeColors: Record<string, string> = {
  INTERVIEW: "bg-blue-500",
  DEADLINE: "bg-red-500",
  REMINDER: "bg-amber-500",
  CUSTOM: "bg-purple-500",
};

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "CUSTOM",
    startAt: "",
    endAt: "",
    jobId: "",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const res = await fetch(
      `/api/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    );
    if (res.ok) {
      setEvents(await res.json());
    }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
    fetch("/api/jobs")
      .then((r) => r.ok && r.json())
      .then((data) => data && setJobs(data));
  }, [fetchEvents]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const getDayEvents = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => {
      const start = new Date(e.startAt);
      return (
        start.getFullYear() === year &&
        start.getMonth() === month &&
        start.getDate() === day
      );
    });
  };

  const openCreateDialog = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    setEditingEvent(null);
    setForm({
      title: "",
      description: "",
      type: "CUSTOM",
      startAt: `${dateStr}T09:00`,
      endAt: `${dateStr}T10:00`,
      jobId: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description || "",
      type: event.type,
      startAt: new Date(event.startAt).toISOString().slice(0, 16),
      endAt: new Date(event.endAt).toISOString().slice(0, 16),
      jobId: event.jobId || "",
    });
    setDialogOpen(true);
  };

  const saveEvent = async () => {
    if (!form.title || !form.startAt || !form.endAt) {
      toast.error("请填写标题和时间");
      return;
    }

    const body = {
      ...form,
      jobId: form.jobId || null,
    };

    if (editingEvent) {
      const res = await fetch(`/api/calendar/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("已更新");
        setDialogOpen(false);
        fetchEvents();
      }
    } else {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("已创建");
        setDialogOpen(false);
        fetchEvents();
      }
    }
  };

  const deleteEvent = async () => {
    if (!editingEvent) return;

    const res = await fetch(`/api/calendar/${editingEvent.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("已删除");
      setDialogOpen(false);
      fetchEvents();
    }
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() === month &&
    today.getDate() === day;

  return (
    <div className="h-[calc(100vh-6.5rem)] flex flex-col space-y-3 max-w-6xl mx-auto">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工作日历</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理面试、截止日期和日程
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            今天
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={prevMonth}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium w-32 text-center">
            {year} 年 {month + 1} 月
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={nextMonth}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar Grid */}
        <Card className="glass border-0 overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-border">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="flex flex-col flex-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0 flex-1">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className={`min-h-[60px] p-1 border-r border-border last:border-r-0 relative group ${
                      day === null ? "bg-white/[0.02]" : "cursor-pointer hover:bg-white/5"
                    }`}
                    onClick={() => day !== null && openCreateDialog(day)}
                  >
                    {day !== null && (
                      <>
                        <span
                          className={`inline-flex items-center justify-center size-6 rounded-full text-xs ${
                            isToday(day)
                              ? "bg-primary text-primary-foreground font-semibold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-0.5">
                          {getDayEvents(day)
                            .slice(0, 3)
                            .map((event) => (
                              <button
                                key={event.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditDialog(event);
                                }}
                                className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate ${eventTypeColors[event.type] || "bg-white/10"} text-white`}
                              >
                                {event.title}
                              </button>
                            ))}
                          {getDayEvents(day).length > 3 && (
                            <p className="text-[10px] text-muted-foreground px-1">
                              +{getDayEvents(day).length - 3} 更多
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        {/* Upcoming Events */}
        <div className="space-y-3 overflow-y-auto">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Clock className="size-4" />
            近期日程
          </h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => new Date(e.startAt) >= new Date())
                .sort(
                  (a, b) =>
                    new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
                )
                .slice(0, 10)
                .map((event) => (
                  <Card
                    key={event.id}
                    className="glass border-0 hover:bg-white/5 transition-all cursor-pointer"
                    onClick={() => openEditDialog(event)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-2 rounded-full mt-1.5 shrink-0 ${eventTypeColors[event.type] || "bg-white/40"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                            <span>
                              {new Date(event.startAt).toLocaleDateString(
                                "zh-CN"
                              )}
                            </span>
                            <span>
                              {new Date(event.startAt).toLocaleTimeString(
                                "zh-CN",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {event.description}
                            </p>
                          )}
                          <Badge
                            variant="outline"
                            className="mt-1.5 text-[10px]"
                          >
                            {eventTypeLabels[event.type] || event.type}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              {events.filter((e) => new Date(e.startAt) >= new Date()).length ===
                0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  暂无日程
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass border-0">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "编辑日程" : "新建日程"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>标题</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="事件标题"
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="可选"
                className="min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      startAt: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      endAt: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={form.type}
                onValueChange={(v) =>
                  v && setForm((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERVIEW">面试</SelectItem>
                  <SelectItem value="DEADLINE">截止日期</SelectItem>
                  <SelectItem value="REMINDER">提醒</SelectItem>
                  <SelectItem value="CUSTOM">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>关联岗位（可选）</Label>
              <Select
                value={form.jobId}
                onValueChange={(v) =>
                  v && setForm((prev) => ({ ...prev, jobId: v }))
                }
                items={[{ value: "", label: "不关联" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title} @ ${j.company}` }))]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不关联</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id} label={`${job.title} @ ${job.company}`}>
                      {job.title} @ {job.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              {editingEvent && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 shrink-0"
                  onClick={deleteEvent}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
              <Button onClick={saveEvent} className="flex-1 gap-2">
                <CalendarPlus className="size-4" />
                {editingEvent ? "保存修改" : "创建日程"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
