import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  FileCheck,
  MessagesSquare,
  Star,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [jobStats, offers, upcomingEvents, recentJobs, recentCalendarEvents] =
    await Promise.all([
      db.job.groupBy({
        by: ["status"],
        where: { userId },
        _count: { id: true },
      }),
      db.offer.count({ where: { userId } }),
      db.calendarEvent.count({
        where: {
          userId,
          startAt: { gte: new Date() },
        },
      }),
      db.job.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          company: true,
          title: true,
          status: true,
          isFavorite: true,
          updatedAt: true,
        },
      }),
      db.calendarEvent.findMany({
        where: {
          userId,
          startAt: { gte: new Date() },
        },
        orderBy: { startAt: "asc" },
        take: 8,
        select: {
          id: true,
          title: true,
          type: true,
          startAt: true,
          endAt: true,
        },
      }),
    ]);

  const statusCounts: Record<string, number> = {};
  jobStats.forEach((s) => {
    statusCounts[s.status] = s._count.id;
  });

  const totalJobs = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const statusLabels: Record<string, string> = {
    INTERESTED: "感兴趣",
    APPLIED: "已投递",
    INTERVIEWING: "面试中",
    OFFER: "已 Offer",
    REJECTED: "已拒绝",
  };

  const eventTypeLabels: Record<string, string> = {
    INTERVIEW: "面试",
    DEADLINE: "截止",
    REMINDER: "提醒",
    CUSTOM: "自定义",
  };

  const eventTypeColors: Record<string, string> = {
    INTERVIEW: "bg-violet-400/10 text-violet-400",
    DEADLINE: "bg-red-400/10 text-red-400",
    REMINDER: "bg-amber-400/10 text-amber-400",
    CUSTOM: "bg-blue-400/10 text-blue-400",
  };

  function formatEventDate(startAt: Date, endAt: Date) {
    const now = new Date();
    const start = new Date(startAt);
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = `${start.getMonth() + 1}/${start.getDate()} ${String(
      start.getHours()
    ).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;

    if (diffDays === 0) return `今天 ${timeStr}`;
    if (diffDays === 1) return `明天 ${timeStr}`;
    if (diffDays <= 7) return `${diffDays}天后 ${timeStr}`;
    return timeStr;
  }

  const stats = [
    { label: "全部岗位", value: totalJobs, icon: Briefcase, color: "text-blue-400" },
    { label: "面试中", value: statusCounts["INTERVIEWING"] || 0, icon: MessagesSquare, color: "text-amber-400" },
    { label: "已 Offer", value: statusCounts["OFFER"] || 0, icon: FileCheck, color: "text-emerald-400" },
    { label: "即将到来", value: upcomingEvents, icon: CalendarDays, color: "text-violet-400" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="glass border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`size-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card className="glass border-0">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">最近岗位</CardTitle>
            <Link
              href="/jobs"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentJobs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                还没有岗位，去添加第一个吧
              </p>
            )}
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {job.isFavorite && (
                    <Star className="size-3 text-amber-400 shrink-0" fill="currentColor" />
                  )}
                  <span className="text-sm font-medium truncate">
                    {job.company}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {job.title}
                  </span>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {statusLabels[job.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { href: "/jobs/new", label: "添加岗位", desc: "手动录入或粘贴 JD 解析" },
              { href: "/resumes", label: "管理简历", desc: "上传、编辑、AI 优化" },
              { href: "/offers", label: "记录 Offer", desc: "管理你的 Offer 列表" },
              { href: "/interviews", label: "面试练习", desc: "AI 模拟面试指导" },
              { href: "/calendar", label: "工作日历", desc: "查看和管理日程" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <TrendingUp className="size-3 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Calendar Events */}
      <Card className="glass border-0">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarDays className="size-4 text-violet-400" />
            近期日程
          </CardTitle>
          <Link
            href="/calendar"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            查看全部
          </Link>
        </CardHeader>
        <CardContent>
          {recentCalendarEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              暂无近期日程
            </p>
          ) : (
            <div className="space-y-1">
              {recentCalendarEvents.map((event) => (
                <Link
                  key={event.id}
                  href="/calendar"
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-2 rounded-full shrink-0 ${
                        eventTypeColors[event.type]?.split(" ")[1] || "text-blue-400"
                      }`}
                      style={{
                        backgroundColor: "currentColor",
                      }}
                    />
                    <span className="text-sm truncate">{event.title}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${
                        eventTypeColors[event.type] || ""
                      }`}
                    >
                      {eventTypeLabels[event.type] || event.type}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {formatEventDate(event.startAt, event.endAt)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
