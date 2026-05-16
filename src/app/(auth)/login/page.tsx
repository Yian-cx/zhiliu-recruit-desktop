"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/validations";
import { toast } from "sonner";
import { Mail, Lock, Loader2, Zap, Phone, MessageCircle } from "lucide-react";
import type { FormEvent } from "react";

type LoginTab = "phone" | "email";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<LoginTab>("phone");

  async function handleEmailLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const parsed = loginSchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("邮箱或密码错误");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handlePhoneLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const phone = formData.get("phone") as string;
    const code = formData.get("code") as string;

    if (!phone || phone.length < 11) {
      toast.error("请输入正确的手机号");
      setLoading(false);
      return;
    }
    if (!code || code.length < 4) {
      toast.error("请输入验证码");
      setLoading(false);
      return;
    }

    toast.info("手机号登录功能即将上线");
    setLoading(false);
  }

  function handleSendCode() {
    toast.info("验证码已发送（演示）");
  }

  function handleSocialLogin(provider: string) {
    toast.info(`${provider} 登录功能即将上线`);
  }

  const labelColor = "#333";
  const inputTextColor = "#111";
  const placeholderColor = "#999";
  const iconColor = "#888";

  return (
    <div className="space-y-6">
      <style>{`
        .login-input::placeholder { color: #999 !important; }
        .login-input { color: #111 !important; }
      `}</style>
      {/* ── Brand header ── */}
      <div className="text-center space-y-3">
        <div
          className="size-14 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-sky-500/20"
          style={{ background: "linear-gradient(135deg, #0EA5E9, #3B82F6)" }}
        >
          <Zap className="size-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">ZhiLiu</h1>
        <p className="text-sm text-gray-500">求职路上，你需要的，都在这里</p>
      </div>

      {/* ── Liquid glass card ── */}
      <div
        className="rounded-2xl p-6 space-y-6"
        style={{
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(40px) saturate(250%)",
          WebkitBackdropFilter: "blur(40px) saturate(250%)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.12), 0 8px 32px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Tab switcher */}
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}
        >
          {(["phone", "email"] as LoginTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all duration-200"
              style={
                activeTab === tab
                  ? {
                      background: "white",
                      color: "#111",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                    }
                  : { color: "#777" }
              }
            >
              {tab === "phone" ? <Phone className="size-4" /> : <Mail className="size-4" />}
              {tab === "phone" ? "手机号" : "邮箱"}
            </button>
          ))}
        </div>

        {/* ── Phone login form ── */}
        {activeTab === "phone" && (
          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: labelColor }}>手机号</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: iconColor }} />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  className="login-input pl-10 py-5 text-base"
                  maxLength={11}
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: inputTextColor,
                    borderRadius: "12px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: labelColor }}>验证码</Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: iconColor }} />
                  <Input
                    name="code"
                    type="text"
                    placeholder="请输入验证码"
                    className="login-input pl-10 py-5 text-base"
                    maxLength={6}
                    style={{
                      background: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(0,0,0,0.10)",
                      color: inputTextColor,
                      borderRadius: "12px",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  className="shrink-0 px-4 py-5 text-sm"
                  style={{
                    background: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(16px) saturate(180%)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: "#333",
                    borderRadius: "12px",
                  }}
                >
                  发送验证码
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full ripple-effect py-5 text-base font-semibold transition-all duration-300 hover-lift"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-5 mr-2 animate-spin" /> : null}
              登录
            </Button>
          </form>
        )}

        {/* ── Email login form ── */}
        {activeTab === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium" style={{ color: labelColor }}>邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: iconColor }} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="hello@example.com"
                  className="login-input pl-10 py-5 text-base"
                  required
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: inputTextColor,
                    borderRadius: "12px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium" style={{ color: labelColor }}>密码</Label>
                <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                  忘记密码？
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4" style={{ color: iconColor }} />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="login-input pl-10 py-5 text-base"
                  required
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(0,0,0,0.10)",
                    color: inputTextColor,
                    borderRadius: "12px",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full ripple-effect py-5 text-base font-semibold transition-all duration-300 hover-lift"
              style={{
                background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                color: "white",
                border: "none",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
              }}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-5 mr-2 animate-spin" /> : null}
              登录
            </Button>
          </form>
        )}

        {/* ── Divider ── */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 text-gray-400" style={{ background: "transparent" }}>
              其他方式登录
            </span>
          </div>
        </div>

        {/* ── Social login buttons ── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => handleSocialLogin("微信")}
            className="py-5 text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(16px) saturate(180%)",
              border: "1px solid rgba(0,0,0,0.08)",
              color: "#333",
              borderRadius: "12px",
            }}
          >
            <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.535 2.006c-2.688 0-4.979 2.19-4.979 4.865 0 2.674 2.291 4.864 4.979 4.864.53 0 1.055-.084 1.545-.247a.453.453 0 0 1 .379.053l1.203.704a.17.17 0 0 0 .088.028.155.155 0 0 0 .153-.155c0-.039-.017-.078-.025-.112l-.203-.773a.305.305 0 0 1 .113-.347C20.67 18.101 22 16.556 22 14.861c0-2.675-2.29-4.864-4.867-4.864zm-2.056 2.553c.383 0 .695.315.695.7a.698.698 0 0 1-.695.7.698.698 0 0 1-.695-.7c0-.385.312-.7.695-.7zm3.72 0c.383 0 .695.315.695.7a.698.698 0 0 1-.695.7.698.698 0 0 1-.695-.7c0-.385.312-.7.695-.7z" fill="#07C160"/>
            </svg>
            微信
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={() => handleSocialLogin("QQ")}
            className="py-5 text-sm font-medium"
            style={{
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(16px) saturate(180%)",
              border: "1px solid rgba(0,0,0,0.08)",
              color: "#333",
              borderRadius: "12px",
            }}
          >
            <svg className="size-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.395 15.035a39.548 39.548 0 0 0-.803-2.264l-1.079-2.695c.001-.032.01-.062.01-.094 0-3.698-4.513-6.065-7.523-6.065-3.012 0-7.524 2.367-7.524 6.065 0 .032.009.062.01.094L3.408 12.77a39.062 39.062 0 0 0-.803 2.264 1.97 1.97 0 0 0 .412 1.887c.064.069.132.13.202.186.07.055.144.102.218.148.127.08.26.147.396.2l1.131.462c.406.166.829.286 1.262.357l.34.822c.204.495.513.932.894 1.259.381.326.82.532 1.28.586.536.063 1.058-.08 1.518-.417.187-.137.356-.29.506-.454.15.164.319.317.506.454.46.337.982.48 1.518.417.46-.054.899-.26 1.28-.586.381-.327.69-.764.894-1.259l.34-.822c.433-.07.856-.19 1.262-.357l1.131-.462a2.197 2.197 0 0 0 .614-.348 1.97 1.97 0 0 0 .412-1.887z" fill="#12B7F5"/>
            </svg>
            QQ
          </Button>
        </div>
      </div>

      {/* ── Register link ── */}
      <p className="text-center text-sm text-gray-500">
        还没有账号？{" "}
        <Link href="/register" className="text-indigo-600 font-medium hover:underline underline-offset-4 transition-colors">
          立即注册
        </Link>
      </p>
    </div>
  );
}
