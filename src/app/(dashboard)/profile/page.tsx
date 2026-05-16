"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModelInput } from "@/components/ui/model-input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User, Lock, Save, Loader2, Crown, BarChart3, Key, AlertCircle, Zap, Mail, Phone, MessageCircle, Globe } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  FREE: "免费用户",
  WEEKLY_VIP: "周 VIP",
  MONTHLY_VIP: "月 VIP",
  YEARLY_VIP: "年 VIP",
  PERMANENT_SVIP: "永久 SVIP",
};

export default function ProfilePage() {
  const { data: session } = useSession();

  const [nickname, setNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wechat, setWechat] = useState("");
  const [qq, setQQ] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Membership
  const [membership, setMembership] = useState<any>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);

  // VIP AI Config
  const [personalApiKey, setPersonalApiKey] = useState("");
  const [personalBaseUrl, setPersonalBaseUrl] = useState("");
  const [personalModelName, setPersonalModelName] = useState("");
  const [savingAiConfig, setSavingAiConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // One-time init from session — use ref to avoid re-render race
  const initDone = useRef(false);
  useEffect(() => {
    if (session?.user && !initDone.current) {
      setNickname(session.user.name || "");
      setAvatarUrl(session.user.image || "");
      setEmail(session.user.email || "");
      setPhone((session.user as any).phone || "");
      setWechat((session.user as any).wechat || "");
      setQQ((session.user as any).qq || "");
      initDone.current = true;
    }
  }, [session]);

  useEffect(() => {
    async function load() {
      const [mRes, aiRes] = await Promise.all([
        fetch("/api/profile/membership"),
        fetch("/api/profile/ai-config"),
      ]);
      if (mRes.ok) setMembership(await mRes.json());
      if (aiRes.ok) {
        const ai = await aiRes.json();
        if (!ai.error) {
          setPersonalApiKey(ai.personalApiKey || "");
          setPersonalBaseUrl(ai.personalBaseUrl || "");
          setPersonalModelName(ai.personalModelName || "");
        }
      }
      setLoadingMembership(false);
    }
    load();
  }, []);

  async function saveProfile() {
    if (!nickname.trim()) {
      toast.error("请输入昵称");
      return;
    }
    setSavingProfile(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: nickname.trim(),
        avatarUrl: avatarUrl.trim() || null,
        email: email.trim() || undefined,
        phone: phone.trim() || null,
        wechat: wechat.trim() || null,
        qq: qq.trim() || null,
      }),
    });
    if (res.ok) {
      toast.success("资料已更新（头像在下次登录时生效）");
    } else {
      const err = await res.json();
      toast.error(err.error || "更新失败");
    }
    setSavingProfile(false);
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("两次密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少 6 位");
      return;
    }
    setSavingPassword(true);
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (res.ok) {
      toast.success("密码已修改");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const err = await res.json();
      toast.error(err.error || "修改失败");
    }
    setSavingPassword(false);
  }

  async function saveAiConfig() {
    setSavingAiConfig(true);
    const res = await fetch("/api/profile/ai-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalApiKey: personalApiKey.trim() || null,
        personalBaseUrl: personalBaseUrl.trim() || null,
        personalModelName: personalModelName.trim() || null,
      }),
    });
    if (res.ok) {
      toast.success("AI 配置已保存");
    } else {
      const err = await res.json();
      toast.error(err.error || "保存失败");
    }
    setSavingAiConfig(false);
  }

  async function testPersonalConnection() {
    if (!personalApiKey.trim()) {
      toast.error("请先填写 API Key");
      return;
    }
    setTestingConnection(true);
    try {
      const res = await fetch("/api/profile/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: personalApiKey.trim(),
          baseUrl: personalBaseUrl.trim() || undefined,
          modelName: personalModelName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "连接测试成功！");
      } else {
        toast.error(data.error || "连接测试失败");
      }
    } catch {
      toast.error("连接测试失败");
    }
    setTestingConnection(false);
  }

  const initials = (nickname || "U").slice(0, 2).toUpperCase();
  const isVip = membership?.isVIP;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">个人资料</h1>
        <p className="text-sm text-muted-foreground mt-1">管理你的账户信息</p>
      </div>

      {/* Membership Status */}
      <Card className="glass border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crown className="size-4" />
            会员状态
            {isVip && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-medium">
                VIP
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMembership ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : membership ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">当前等级</span>
                <span className="text-sm font-medium">
                  {TIER_LABELS[membership.membershipTier] || membership.membershipTier}
                </span>
              </div>
              {membership.membershipExpiresAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">到期时间</span>
                  <span className="text-sm font-medium">
                    {new Date(membership.membershipExpiresAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
              )}
              {!isVip && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
                  <AlertCircle className="size-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    升级 VIP 每月 300 次 AI 调用（永久 SVIP 每月 50 次），可绑定个人模型不限次数，岗位/简历配额无上限，请联系管理员开通
                  </p>
                </div>
              )}
              <Separator />
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <BarChart3 className="size-3" />AI 调用
                </p>
                <div className="bg-white/5 rounded-lg p-3 text-xs space-y-2.5">
                  {/* Platform */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">平台模型</span>
                    {membership.usage?.ai?.personal?.enabled ? (
                      <span className="text-muted-foreground">—</span>
                    ) : isVip ? (
                      <span className="font-medium">
                        {membership.usage?.ai?.platform?.monthly ?? 0}
                        <span className="text-muted-foreground">
                          {" "}/{" "}{membership.usage?.ai?.platform?.monthlyLimit ?? "∞"} 次/月
                        </span>
                      </span>
                    ) : (
                      <span className="font-medium">
                        {membership.usage?.ai?.platform?.today ?? 0}
                        <span className="text-muted-foreground">
                          {" "}/{" "}{membership.usage?.ai?.platform?.dailyLimit ?? 0} 次/日
                        </span>
                      </span>
                    )}
                  </div>
                  <Separator />
                  {/* Personal */}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">个人模型</span>
                    {membership.usage?.ai?.personal?.enabled ? (
                      <span className="font-medium text-emerald-400">已启用 · 不限次数</span>
                    ) : isVip ? (
                      <span className="text-muted-foreground">未配置 · 可绑定个人 Key</span>
                    ) : (
                      <span className="text-muted-foreground">升级 VIP 后可配置</span>
                    )}
                  </div>
                </div>
                {membership.usage?.ai?.description && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {membership.usage.ai.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  模拟面试
                </p>
                <div className="bg-white/5 rounded-lg p-2 text-xs">
                  <p className="font-medium">
                    {membership.usage?.interviews?.today ?? 0} /{" "}
                    {membership.usage?.interviews?.dailyLimit === Infinity
                      ? "∞"
                      : membership.usage?.interviews?.dailyLimit ?? 0}{" "}
                    次（今日）
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">资源用量</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-muted-foreground">岗位</span>
                    <p className="font-medium">
                      {membership.usage?.resources?.jobs ?? 0} /{" "}
                      {membership.usage?.resources?.jobsLimit === Infinity
                        ? "∞"
                        : membership.usage?.resources?.jobsLimit ?? 0}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-muted-foreground">简历</span>
                    <p className="font-medium">
                      {membership.usage?.resources?.resumes ?? 0} /{" "}
                      {membership.usage?.resources?.resumesLimit === Infinity
                        ? "∞"
                        : membership.usage?.resources?.resumesLimit ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">加载失败</p>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="glass border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="size-4" />基本信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + Nickname */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Label htmlFor="avatar">头像 URL</Label>
              <Input
                id="avatar"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="bg-white/5"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nickname">昵称</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="bg-white/5"
            />
          </div>

          <Separator />

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="profile-email" className="flex items-center gap-1.5">
              <Mail className="size-3.5 text-foreground/70" />邮箱
            </Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-white/5"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="profile-phone" className="flex items-center gap-1.5">
              <Phone className="size-3.5 text-foreground/70" />手机号
              {phone && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400">
                  已绑定
                </span>
              )}
            </Label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="138****1234"
              className="bg-white/5"
              maxLength={11}
            />
          </div>

          <Separator />
          <p className="text-xs text-foreground/50 flex items-center gap-1.5">
            <Globe className="size-3" />绑定社交账号
          </p>

          {/* WeChat */}
          <div className="space-y-2">
            <Label htmlFor="profile-wechat" className="flex items-center gap-1.5">
              <MessageCircle className="size-3.5 text-foreground/70" />微信
              {wechat && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400">
                  已绑定
                </span>
              )}
            </Label>
            <Input
              id="profile-wechat"
              value={wechat}
              onChange={(e) => setWechat(e.target.value)}
              placeholder="微信号"
              className="bg-white/5"
            />
          </div>

          {/* QQ */}
          <div className="space-y-2">
            <Label htmlFor="profile-qq" className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-foreground/70" />QQ
              {qq && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400">
                  已绑定
                </span>
              )}
            </Label>
            <Input
              id="profile-qq"
              value={qq}
              onChange={(e) => setQQ(e.target.value)}
              placeholder="QQ 号"
              className="bg-white/5"
            />
          </div>

          <Button onClick={saveProfile} disabled={savingProfile}>
            <Save className="size-4 mr-2" />
            {savingProfile ? "保存中..." : "保存资料"}
          </Button>
        </CardContent>
      </Card>

      {/* VIP AI Config */}
      {isVip && (
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Key className="size-4" />个人 AI 配置（VIP 专属）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              设置后将使用你的个人 API Key 调用 AI，调用不限次数，不消耗平台额度。
            </p>
            <div className="space-y-2">
              <Label htmlFor="personal-apikey">API Key</Label>
              <Input
                id="personal-apikey"
                type="password"
                placeholder="留空则使用管理员配置"
                value={personalApiKey}
                onChange={(e) => setPersonalApiKey(e.target.value)}
                className="bg-white/5 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-baseurl">Base URL</Label>
              <Input
                id="personal-baseurl"
                placeholder="留空则使用管理员配置"
                value={personalBaseUrl}
                onChange={(e) => setPersonalBaseUrl(e.target.value)}
                className="bg-white/5 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personal-model">模型名称</Label>
              <ModelInput
                id="personal-model"
                placeholder="留空则使用管理员配置"
                value={personalModelName}
                onChange={setPersonalModelName}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={saveAiConfig} disabled={savingAiConfig} variant="secondary">
                <Save className="size-4 mr-2" />
                {savingAiConfig ? "保存中..." : "保存 AI 配置"}
              </Button>
              <Button
                onClick={testPersonalConnection}
                disabled={testingConnection}
                variant="outline"
              >
                {testingConnection ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="size-4 mr-2" />
                )}
                测试连接
              </Button>
            </div>

            {/* DeepSeek 配置指南 */}
            <Separator />
            <div className="space-y-3">
              <p className="text-xs font-medium flex items-center gap-1.5">
                <Key className="size-3" />推荐配置：DeepSeek 模型
              </p>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">1.</span>
                  <span>
                    访问{" "}
                    <a
                      href="https://platform.deepseek.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.deepseek.com
                    </a>
                    ，注册/登录 DeepSeek 开放平台
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">2.</span>
                  <span>
                    在左侧菜单「API Keys」中点击「创建 API Key」，复制生成的密钥
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">3.</span>
                  <span>
                    将 API Key 粘贴到上方输入框，Base URL 默认使用{" "}
                    <code className="text-[11px] bg-white/10 px-1 py-0.5 rounded">
                      https://api.deepseek.com
                    </code>
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-medium shrink-0">4.</span>
                  <span>
                    模型名推荐 <code className="text-[11px] bg-white/10 px-1 py-0.5 rounded">deepseek-chat</code>，
                    如需推理能力可使用{" "}
                    <code className="text-[11px] bg-white/10 px-1 py-0.5 rounded">deepseek-reasoner</code>
                    。点击模型名输入框可搜索各大主流平台的模型名称
                  </span>
                </div>
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-400/10 border border-amber-400/30">
                  <AlertCircle className="size-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-400 leading-relaxed">
                    <span className="font-semibold">注意：</span>模型名称必须与您的 API 提供商支持的一致，填写错误将导致所有 AI 功能无法使用。请务必通过输入框下拉搜索选择，勿随意填写。
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="https://www.xiaohongshu.com/search_result?keyword=DeepSeek+API%E6%95%99%E7%A8%8B"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  小红书教程
                </a>
                <span className="text-muted-foreground">·</span>
                <a
                  href="https://www.douyin.com/search/DeepSeek%20API%E9%85%8D%E7%BD%AE%E6%95%99%E7%A8%8B"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
                >
                  抖音教程
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card className="glass border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Lock className="size-4" />修改密码
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current">当前密码</Label>
            <Input
              id="current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="newpw">新密码</Label>
            <Input
              id="newpw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">确认新密码</Label>
            <Input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/5"
            />
          </div>
          <Button onClick={changePassword} disabled={savingPassword} variant="secondary">
            {savingPassword ? "修改中..." : "修改密码"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
