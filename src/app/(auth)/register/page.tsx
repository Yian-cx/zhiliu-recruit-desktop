"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/validations";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  User,
  Phone,
  Loader2,
  Zap,
  MessageCircle,
  Eye,
  EyeOff,
  ChevronDown,
} from "lucide-react";

type LoginMethod = "phone" | "email";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<LoginMethod>("phone");
  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(0);

  function handleSendCode() {
    if (method === "phone") {
      const phone = (document.getElementById("phone") as HTMLInputElement)?.value?.trim();
      if (!phone) { toast.error("请先填写手机号"); return; }
      setCountdown(60);
      toast.success(`验证码已发送至 ${phone}`);
    } else {
      const email = (document.getElementById("email") as HTMLInputElement)?.value?.trim();
      if (!email) { toast.error("请先填写邮箱"); return; }
      setCountdown(60);
      toast.success(`验证码已发送至 ${email}`);
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string)?.trim() || undefined;
    const phone = (formData.get("phone") as string)?.trim() || undefined;
    const data = {
      email,
      phone,
      code: formData.get("code") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      nickname: (formData.get("nickname") as string)?.trim() || undefined,
    };

    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error(result.error || "注册失败");
      setLoading(false);
      return;
    }

    const loginResult = await signIn("credentials", {
      email: result.email,
      password: data.password,
      redirect: false,
    });

    if (loginResult?.error) {
      toast.success("注册成功，请登录");
      router.push("/login");
      return;
    }

    toast.success("注册成功！");
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

  return (
    <div className="space-y-5">
      <style>{`
        .reg-input::placeholder { color: #999 !important; }
        .reg-input { color: #111 !important; }
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
        <p className="text-xs text-gray-500">求职路上，你需要的，都在这里</p>
      </div>

      {/* ── Liquid glass card ── */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(40px) saturate(250%)",
          WebkitBackdropFilter: "blur(40px) saturate(250%)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nickname */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#333" }}>昵称</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
              <Input
                id="nickname"
                name="nickname"
                placeholder="你的名字"
                className="reg-input pl-9 h-10 text-sm"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Method selector + field */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#333" }}>注册方式</Label>

            {/* Dropdown trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMethodPicker(!showMethodPicker)}
                className="flex items-center gap-2 w-full h-10 px-3 text-sm rounded-xl text-left"
                style={{
                  background: "rgba(220,235,255,0.45)",
                  backdropFilter: "blur(16px) saturate(180%)",
                  border: "1px solid rgba(150,190,240,0.3)",
                  color: "#222",
                }}
              >
                {method === "phone" ? (
                  <Phone className="size-3.5 shrink-0" style={{ color: "#666" }} />
                ) : (
                  <Mail className="size-3.5 shrink-0" style={{ color: "#666" }} />
                )}
                <span className="flex-1">{method === "phone" ? "手机号注册" : "邮箱注册"}</span>
                <ChevronDown
                  className={`size-3.5 transition-transform ${showMethodPicker ? "rotate-180" : ""}`}
                  style={{ color: "#666" }}
                />
              </button>

              {/* Dropdown menu */}
              {showMethodPicker && (
                <div
                  className="absolute z-20 top-full mt-1 w-full rounded-xl overflow-hidden"
                  style={{
                    background: "rgba(235,245,255,0.95)",
                    backdropFilter: "blur(24px) saturate(200%)",
                    border: "1px solid rgba(150,190,240,0.3)",
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
                  }}
                >
                  {([
                    { key: "phone" as LoginMethod, icon: Phone, label: "手机号注册" },
                    { key: "email" as LoginMethod, icon: Mail, label: "邮箱注册" },
                  ]).map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setMethod(key); setShowMethodPicker(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-white/60 transition-colors"
                      style={{ color: method === key ? "#111" : "#555" }}
                    >
                      <Icon className="size-3.5" style={{ color: "#777" }} />
                      <span>{label}</span>
                      {method === key && (
                        <span className="ml-auto size-2 rounded-full" style={{ background: "#4F46E5" }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone / Email input */}
            {method === "phone" ? (
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  className="reg-input pl-9 h-10 text-sm"
                  maxLength={11}
                  style={inputStyle}
                />
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="请输入邮箱"
                  className="reg-input pl-9 h-10 text-sm"
                  style={inputStyle}
                />
              </div>
            )}
          </div>

          {/* Verification code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#333" }}>
              验证码 <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="请输入验证码"
                  className="reg-input pl-9 h-10 text-sm"
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
                className="shrink-0 px-3 h-10 text-xs"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(16px) saturate(180%)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  color: "#333",
                  borderRadius: "12px",
                }}
              >
                {countdown > 0 ? `${countdown}s` : "发送"}
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#333" }}>密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="至少 6 位"
                className="reg-input pl-9 pr-9 h-10 text-sm"
                style={inputStyle}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#888" }}
              >
                {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium" style={{ color: "#333" }}>确认密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#888" }} />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="再次输入密码"
                className="reg-input pl-9 pr-9 h-10 text-sm"
                style={inputStyle}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "#888" }}
              >
                {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full ripple-effect h-10 text-sm font-semibold transition-all duration-300 hover-lift"
            style={{
              background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
              color: "white",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
            }}
            disabled={loading}
          >
            {loading && <Loader2 className="size-4 mr-1.5 animate-spin" />}
            注册
          </Button>
        </form>
      </div>

      {/* Login link */}
      <p className="text-center text-xs text-gray-500">
        已有账户？{" "}
        <Link href="/login" className="text-indigo-600 font-medium hover:underline underline-offset-4 transition-colors">
          登录
        </Link>
      </p>
    </div>
  );
}
