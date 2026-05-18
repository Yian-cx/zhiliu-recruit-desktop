"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  FileCheck,
  MessagesSquare,
  BookOpen,
  Compass,
  StickyNote,
  CalendarDays,
  User,
  Settings,
  LogOut,
  Crown,
  Sun,
  Moon,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNav: NavItem[] = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/jobs", label: "岗位管理", icon: Briefcase },
  { href: "/resumes", label: "简历管理", icon: FileText },
  { href: "/offers", label: "Offer 管理", icon: FileCheck },
  { href: "/interviews", label: "面试指导", icon: MessagesSquare },
  { href: "/onboarding", label: "入职技能", icon: BookOpen },
  { href: "/career", label: "职业规划", icon: Compass },
  { href: "/notes", label: "岗位笔记", icon: StickyNote },
  { href: "/calendar", label: "工作日历", icon: CalendarDays },
];

const TIER_LABELS: Record<string, string> = {
  FREE: "普通用户",
  WEEKLY_VIP: "周 VIP",
  MONTHLY_VIP: "月 VIP",
  YEARLY_VIP: "年 VIP",
  PERMANENT_SVIP: "永久 SVIP",
};

function getTierBadge(tier: string) {
  if (tier === "FREE") return null;
  const isSVIP = tier === "PERMANENT_SVIP";
  return (
    <span
      className={cn(
        "text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide",
        isSVIP
          ? "bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-400 ring-1 ring-amber-400/30"
          : "bg-gradient-to-r from-sky-400/20 to-blue-500/20 text-sky-600 dark:text-sky-400 ring-1 ring-sky-400/30"
      )}
    >
      {isSVIP ? "SVIP" : "VIP"}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const tier = session?.user?.membershipTier || "FREE";
  const isVIP = tier !== "FREE" || isAdmin;
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    if (newTheme === "green-glass" && !isVIP) {
      toast.info("蓝白液态玻璃主题仅 VIP 用户可用");
      return;
    }
    setTheme(newTheme);
  };

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
    document.body.setAttribute("data-sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const initials = (session?.user?.name || "U").slice(0, 2).toUpperCase();

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen flex flex-col border-r border-border bg-sidebar shrink-0 pt-10",
        "transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-14 shrink-0 pl-3 pr-[22px]">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="size-8 rounded-xl mx-auto flex items-center justify-center bg-gradient-to-br from-sky-400/20 to-blue-500/20 hover:from-sky-400/30 hover:to-blue-500/30 transition-all"
          >
            <Zap className="size-4 text-sky-400" />
          </button>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2.5 min-w-0 group">
              <div
                className="size-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20"
                style={{ background: "linear-gradient(135deg, #0EA5E9, #3B82F6)" }}
              >
                <Zap className="size-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
                ZhiLiu
              </span>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              className="size-7 shrink-0 ml-auto rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <PanelLeftClose className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-4 px-2.5 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 h-10 px-2.5 rounded-xl text-sm transition-all duration-200 group relative",
                      isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {/* Active left accent */}
                    {isActive && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-500" />
                    )}
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center size-5",
                        isActive && "text-sky-400"
                      )}
                    >
                      <item.icon className="size-[18px]" />
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                }
              />
              {collapsed && (
                <TooltipContent side="right" className="font-medium">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>

      {/* ── User menu ── */}
      <div className="border-t border-border/50 p-2.5">
        <Popover>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <PopoverTrigger
                    render={
                      <button className="w-full flex justify-center p-1.5 rounded-xl hover:bg-muted/40 transition-all">
                        <Avatar className="size-8 ring-2 ring-sky-500/30 ring-offset-1 ring-offset-sidebar">
                          <AvatarImage src={session?.user?.image || undefined} />
                          <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-sky-400 to-blue-500 text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    }
                  />
                }
              />
              <TooltipContent side="right" className="font-medium">
                {session?.user?.name || "用户"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <PopoverTrigger
              render={
                <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-all text-left group">
                  <Avatar className="size-9 shrink-0 ring-2 ring-sky-500/30 ring-offset-1 ring-offset-sidebar group-hover:ring-sky-500/50 transition-all">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-sky-400 to-blue-500 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {session?.user?.name || "用户"}
                      </p>
                      {getTierBadge(tier)}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {isAdmin ? "管理员" : TIER_LABELS[tier] || "求职者"}
                    </p>
                  </div>
                  <ChevronUp className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                </button>
              }
            />
          )}

          <PopoverContent side="top" align="start" sideOffset={10} className="w-56 p-2">
            <div className="flex items-center gap-3 px-2 py-1.5">
              <Avatar className="size-8 shrink-0 ring-2 ring-sky-500/20">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback className="text-[11px] font-semibold bg-gradient-to-br from-sky-400 to-blue-500 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {session?.user?.name || "用户"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {isAdmin ? "管理员" : TIER_LABELS[tier] || "求职者"}
                </p>
              </div>
            </div>

            <div className="h-px bg-border/50 my-1.5" />

            <Link
              href="/profile"
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <User className="size-4" />
              个人资料
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <Settings className="size-4" />
                管理后台
              </Link>
            )}

            <div className="space-y-0.5">
              <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                主题
              </p>
              <button
                onClick={() => handleThemeChange("dark")}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all w-full text-left",
                  theme === "dark"
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Moon className="size-4" />
                暗色模式
              </button>
              <button
                onClick={() => handleThemeChange("light")}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all w-full text-left",
                  theme === "light"
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Sun className="size-4" />
                亮色模式
              </button>
              <button
                onClick={() => handleThemeChange("green-glass")}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-all w-full text-left",
                  theme === "green-glass"
                    ? "text-foreground bg-muted/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Sparkles className={cn("size-4", !isVIP && "text-amber-400")} />
                <span className="flex-1">蓝白液态玻璃</span>
                {!isVIP && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                    VIP
                  </span>
                )}
              </button>
            </div>

            <div className="h-px bg-border/50 my-1.5" />

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all w-full text-left"
            >
              <LogOut className="size-4" />
              退出
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  );
}
