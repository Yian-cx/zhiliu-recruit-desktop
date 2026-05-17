"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelInput } from "@/components/ui/model-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Wifi, Loader2, Shield, Users, Search, ChevronLeft, ChevronRight } from "lucide-react";

const TIER_OPTIONS = [
  { value: "FREE", label: "普通用户" },
  { value: "WEEKLY_VIP", label: "周 VIP" },
  { value: "MONTHLY_VIP", label: "月 VIP" },
  { value: "YEARLY_VIP", label: "年 VIP" },
  { value: "PERMANENT_SVIP", label: "永久 SVIP" },
];

type Tab = "ai" | "users";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ai");

  // AI Config
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [vipModelName, setVipModelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // User Management
  const [users, setUsers] = useState<any[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  const pageSize = 10;

  // Redirect non-admin users
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.replace("/");
      toast.error("无权限访问管理后台");
    }
  }, [status, session, router]);

  // Show nothing while checking auth
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
    return null;
  }

  useEffect(() => {
    async function loadConfig() {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.baseUrl) setBaseUrl(data.baseUrl);
        if (data.modelName) setModelName(data.modelName);
        if (data.vipModelName) setVipModelName(data.vipModelName);
      }
      setLoading(false);
    }
    loadConfig();
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const params = new URLSearchParams({
      page: String(userPage),
      pageSize: String(pageSize),
    });
    if (userSearch) params.set("search", userSearch);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setUserTotal(data.total);
    }
    setLoadingUsers(false);
  }, [userPage, userSearch]);

  useEffect(() => {
    if (tab === "users") loadUsers();
  }, [tab, loadUsers]);

  async function saveConfig() {
    setSaving(true);
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, baseUrl, modelName, vipModelName }),
    });
    if (res.ok) {
      toast.success("配置已保存");
      setSaving(false);
      window.dispatchEvent(new Event("api-config-changed"));
      await testConnection();
    } else {
      toast.error("保存失败");
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/test-connection");
      if (res.ok) {
        toast.success("连接测试成功！AI 服务正常");
      } else {
        const err = await res.json();
        toast.error(err.error || "连接失败");
      }
    } catch {
      toast.error("连接测试失败");
    }
    setTesting(false);
    window.dispatchEvent(new Event("api-config-changed"));
  }

  async function updateUserMembership(userId: string, tier: string) {
    setSavingUser(userId);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, membershipTier: tier }),
    });
    if (res.ok) {
      toast.success("会员等级已更新");
      loadUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || "更新失败");
    }
    setSavingUser(null);
  }

  const totalPages = Math.ceil(userTotal / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">管理后台</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          AI 模型配置与用户管理
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={tab === "ai" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("ai")}
        >
          <Shield className="size-4 mr-2" />AI 配置
        </Button>
        <Button
          variant={tab === "users" ? "default" : "secondary"}
          size="sm"
          onClick={() => setTab("users")}
        >
          <Users className="size-4 mr-2" />用户管理
        </Button>
      </div>

      {tab === "ai" && (
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">DeepSeek 配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apikey">API Key</Label>
              <Input
                id="apikey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-white/5 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseurl">Base URL</Label>
              <Input
                id="baseurl"
                placeholder="https://api.deepseek.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="bg-white/5 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">默认模型</Label>
              <ModelInput
                id="model"
                placeholder="deepseek-chat"
                value={modelName}
                onChange={setModelName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vipmodel">VIP 专用模型（可选）</Label>
              <ModelInput
                id="vipmodel"
                placeholder="如 deepseek-reasoner，留空则 VIP 也使用默认模型"
                value={vipModelName}
                onChange={setVipModelName}
              />
              <p className="text-xs text-muted-foreground">
                VIP 用户若未设置个人 Key，将使用此模型
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={saveConfig} disabled={saving}>
                <Save className="size-4 mr-2" />
                {saving ? "保存中..." : "保存配置"}
              </Button>
              <Button
                onClick={testConnection}
                disabled={testing}
                variant="secondary"
              >
                {testing ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Wifi className="size-4 mr-2" />
                )}
                测试连接
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "users" && (
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>用户列表（{userTotal}）</span>
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索邮箱或昵称..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserPage(1);
                  }}
                  className="pl-7 h-7 text-xs bg-white/5 w-48"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {users.map((u: any) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {u.nickname || "未设置"}
                          </span>
                          {u.role === "ADMIN" && (
                            <Badge variant="secondary" className="text-[10px] px-1 h-4">
                              管理员
                            </Badge>
                          )}
                          {u.membershipTier !== "FREE" && (
                            <Badge className="text-[10px] px-1 h-4 bg-amber-400/20 text-amber-400 border-0">
                              {u.membershipTier === "PERMANENT_SVIP" ? "SVIP" : "VIP"}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        <p className="text-[10px] text-muted-foreground">
                          岗位 {u._count.jobs} · 简历 {u._count.resumes} ·{" "}
                          {new Date(u.createdAt).toLocaleDateString("zh-CN")} 加入
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {savingUser === u.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Select
                            value={u.membershipTier}
                            onValueChange={(v) => updateUserMembership(u.id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIER_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      暂无用户
                    </p>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <span className="text-xs text-muted-foreground">
                      第 {userPage} / {totalPages} 页
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={userPage <= 1}
                        onClick={() => setUserPage((p) => p - 1)}
                      >
                        <ChevronLeft className="size-3 mr-1" />上一页
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={userPage >= totalPages}
                        onClick={() => setUserPage((p) => p + 1)}
                      >
                        下一页<ChevronRight className="size-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
