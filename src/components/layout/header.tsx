"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useCoach } from "@/lib/coach-context";
import { Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const pathLabels: Record<string, string> = {
  "/": "仪表盘",
  "/jobs": "岗位管理",
  "/resumes": "简历管理",
  "/offers": "Offer 管理",
  "/interviews": "面试指导",
  "/onboarding": "入职技能",
  "/career": "职业规划",
  "/notes": "岗位笔记",
  "/calendar": "工作日历",
  "/profile": "个人资料",
  "/admin": "管理后台",
};

export function Header() {
  const pathname = usePathname();
  const { isOpen, open } = useCoach();
  const [apiStatus, setApiStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  const checkApiStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setApiStatus(data.connected ? "connected" : "disconnected");
    } catch {
      setApiStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    checkApiStatus();
  }, [checkApiStatus]);

  useEffect(() => {
    const handler = () => checkApiStatus();
    window.addEventListener("api-config-changed", handler);
    return () => window.removeEventListener("api-config-changed", handler);
  }, [checkApiStatus]);

  const label = pathname
    ? pathLabels[pathname] ||
      (pathname.startsWith("/jobs/") ? "岗位详情" :
       pathname.startsWith("/resumes/") ? "简历编辑" :
       pathname.startsWith("/offers/") ? "Offer 详情" :
       pathname.startsWith("/interviews/") ? "面试对话" :
       pathname.startsWith("/notes/") ? "笔记编辑" :
       pathname.startsWith("/profile") ? "个人资料" : "")
    : "";

  return (
    <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border bg-background/60 backdrop-blur-xl flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium">{label}</h2>
      </div>

      <div className="flex items-center gap-3">
        {!isOpen && (
          <button
            onClick={open}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #3B82F6)" }}
          >
            <Zap className="size-3.5" />
            AI 导师
          </button>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={checkApiStatus}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">
                  {apiStatus === "connected"
                    ? "API 已连接"
                    : apiStatus === "disconnected"
                      ? "API 未连接"
                      : "检测中..."}
                </span>
                <span
                  className={`block size-2 rounded-full ${
                    apiStatus === "connected"
                      ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]"
                      : apiStatus === "disconnected"
                        ? "bg-red-400"
                        : "bg-muted-foreground animate-pulse"
                  }`}
                />
              </button>
            }
          />
          <TooltipContent side="bottom">
            {apiStatus === "connected"
              ? "AI API 已连接 — 点击重新检测"
              : apiStatus === "disconnected"
                ? "AI API 无法连接 — 点击重试"
                : "正在检测 API 连接状态..."}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
