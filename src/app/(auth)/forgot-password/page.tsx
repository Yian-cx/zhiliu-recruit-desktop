"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Lock,
  Loader2,
  ArrowLeft,
  Zap,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";

type ResetTab = "phone" | "email";
type ResetStep = "verify" | "new-password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ResetTab>("phone");
  const [step, setStep] = useState<ResetStep>("verify");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [verifiedTarget, setVerifiedTarget] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");

  function handleSendCode() {
    setCountdown(60);
    toast.success("验证码已发送");
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const target = activeTab === "phone" ? formData.get("phone") as string : formData.get("email") as string;
    const code = formData.get("code") as string;

    if (!target || target.length < 5) {
      toast.error(activeTab === "phone" ? "请输入正确的手机号" : "请输入正确的邮箱");
      setLoading(false);
      return;
    }
    if (!code || code.length < 4) {
      toast.error("请输入验证码");
      setLoading(false);
      return;
    }

    setVerifiedTarget(target);
    setVerifiedCode(code);
    setStep("new-password");
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (!password || password.length < 6) { toast.error("密码至少需要 6 位"); setLoading(false); return; }
    if (password !== confirm) { toast.error("两次输入的密码不一致"); setLoading(false); return; }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [activeTab === "phone" ? "phone" : "email"]: verifiedTarget,
        code: verifiedCode,
        password,
        confirmPassword: confirm,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error || "重置密码失败");
      setLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email: result.email,
      password,
      redirect: false,
    });

    if (loginResult?.error) {
      toast.success("密码重置成功，请登录");
      router.push("/login");
      return;
    }

    toast.success("密码重置成功！");
    router.push("/");
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.10)",
    color: "#111",
    borderRadius: "12px",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
  };

  const btnOutlineStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(16px) saturate(180%)",
    border: "1px solid rgba(0,0,0,0.10)",
    color: "#333",
    borderRadius: "12px",
  };

  return (
    <div className="space-y-5">
      <style>{`
        .fp-input::placeholder { color: #999 !important; }
        .fp-input { color: #111 !important; }
      `}</style>

      {/* ── Brand header ── */}
      <div className="text-center space-y-2">
        <div
          className="size-12 rounded-xl mx-auto flex items-center justify-center shadow-lg shadow-sky-500/20"
          style={{ background: "linear-gradient(135deg, #0EA5E9, #3B82F6)" }}
        >
          <Zap className="size-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">ZhiLiu</h1>
        <p className="text-xs text-gray-500">验证身份后设置新密码</p>
      </div>

      {/* ── Liquid glass card ── */}
      <div
        className="rounded-2xl p-5 space-y-5"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(40px) saturate(250%)",
          WebkitBackdropFilter: "blur(40px) saturate(250%)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Back link */}
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="size-4" />
          返回登录
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: step === "verify" ? "#4F46E5" : "rgba(0,0,0,0.06)" }} />
          <div className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: step === "new-password" ? "#4F46E5" : "rgba(0,0,0,0.06)" }} />
        </div>

        {/* ── Step 1: Verify identity ── */}
        {step === "verify" && (
          <>
            {/* Tab switcher */}
            <div className="flex rounded-lg p-0.5" style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
              {(["phone", "email"] as ResetTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  style={activeTab === tab
                    ? { background: "white", color: "#111", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
                    : { color: "#777" }}
                >
                  {tab === "phone" ? <Phone className="size-4" /> : <Mail className="size-4" />}
                  {tab === "phone" ? "手机验证" : "邮箱验证"}
                </button>
              ))}
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: "#333" }}>
                  {activeTab === "phone" ? "手机号" : "邮箱地址"}
                </Label>
                <div className="relative">
                  {activeTab === "phone" ? (
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#888" }} />
                  ) : (
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#888" }} />
                  )}
                  <Input
                    name={activeTab === "phone" ? "phone" : "email"}
                    type={activeTab === "phone" ? "tel" : "email"}
                    placeholder={activeTab === "phone" ? "请输入已绑定的手机号" : "请输入已绑定的邮箱"}
                    className="fp-input pl-10 py-5 text-sm"
                    maxLength={activeTab === "phone" ? 11 : undefined}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: "#333" }}>验证码</Label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#888" }} />
                    <Input
                      name="code"
                      type="text"
                      placeholder="请输入验证码"
                      className="fp-input pl-10 py-5 text-sm"
                      maxLength={6}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="shrink-0 px-4 py-5 text-sm"
                    style={btnOutlineStyle}
                  >
                    {countdown > 0 ? `${countdown}s` : "发送验证码"}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-5 text-sm font-semibold transition-all duration-300 hover-lift"
                style={{
                  background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
                }}
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
                验证身份
              </Button>
            </form>
          </>
        )}

        {/* ── Step 2: Set new password ── */}
        {step === "new-password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-gray-900">设置新密码</h2>
              <p className="text-sm text-gray-500">请输入你的新密码</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: "#333" }}>新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#888" }} />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="至少 6 位"
                  className="fp-input pl-10 pr-10 py-5 text-sm"
                  style={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#888" }}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: "#333" }}>确认新密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: "#888" }} />
                <Input
                  name="confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder="再次输入新密码"
                  className="fp-input pl-10 pr-10 py-5 text-sm"
                  style={inputStyle}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#888" }}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-5 text-sm font-semibold transition-all duration-300 hover-lift"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
              }}
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
              重置密码
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-gray-500">
        想起密码了？{" "}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline underline-offset-4 transition-colors">
          返回登录
        </Link>
      </p>
    </div>
  );
}
