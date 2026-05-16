"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Loader2, Eye } from "lucide-react";
import Link from "next/link";

interface ParsedJD {
  company: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  location: string | null;
  remote: boolean;
  skills: string[];
  education: string | null;
  experience: string | null;
  benefits: string[];
  isOutsourcing: boolean;
  summary: string;
}

export default function NewJobPage() {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedJD | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Manual form fields
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [location, setLocation] = useState("");
  const [remote, setRemote] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState("INTERESTED");

  async function handleParse() {
    if (jd.length < 10) {
      toast.error("请输入完整的岗位描述");
      return;
    }
    setParsing(true);
    try {
      const res = await fetch("/api/jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "解析失败");
        return;
      }
      const data = await res.json();
      setParsed(data);
      // Auto-fill form
      setCompany(data.company);
      setTitle(data.title);
      if (data.salaryMin) setSalaryMin(String(data.salaryMin));
      if (data.salaryMax) setSalaryMax(String(data.salaryMax));
      if (data.location) setLocation(data.location);
      setRemote(data.remote);
      toast.success("AI 解析完成！");
    } catch {
      toast.error("解析失败");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        title,
        jd,
        salaryMin: salaryMin ? parseInt(salaryMin) : null,
        salaryMax: salaryMax ? parseInt(salaryMax) : null,
        location: location || null,
        remote,
        sourceUrl: sourceUrl || null,
        status,
      }),
    });

    if (res.ok) {
      toast.success("岗位添加成功！");
      router.push("/jobs");
      return;
    }
    const err = await res.json();
    toast.error(err.error || "添加失败");
    setSubmitting(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/jobs" className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">添加岗位</h1>
          <p className="text-sm text-muted-foreground mt-1">
            手动填写或粘贴 JD 由 AI 自动解析
          </p>
        </div>
      </div>

      {/* JD Input + AI Parse */}
      <Card className="glass border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="size-4" />
            AI 解析 JD
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="粘贴岗位描述（JD）文本，AI 将自动提取公司、职位、薪资等信息..."
            className="min-h-32 resize-y"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleParse}
              disabled={parsing || jd.length < 10}
              variant="secondary"
              type="button"
            >
              {parsing ? (
                <Loader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              {parsing ? "解析中..." : "AI 解析"}
            </Button>
            {jd.length > 0 && jd.length < 10 && (
              <span className="text-xs text-muted-foreground">
                还需输入 {10 - jd.length} 个字符
              </span>
            )}
            {parsed && (
              <Badge variant="secondary" className="bg-emerald-400/10 text-emerald-400 border-emerald-400/20">
                解析完成
              </Badge>
            )}
            {parsed?.isOutsourcing && (
              <Badge variant="secondary" className="bg-red-400/10 text-red-400 border-red-400/20">
                疑似外包
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">公司名称 *</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-white/5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">职位名称 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMin">最低月薪</Label>
              <Input
                id="salaryMin"
                type="number"
                placeholder="例：15000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salaryMax">最高月薪</Label>
              <Input
                id="salaryMax"
                type="number"
                placeholder="例：25000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">工作城市</Label>
              <Input
                id="location"
                placeholder="例：北京"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-white/5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sourceUrl">来源链接</Label>
              <Input
                id="sourceUrl"
                type="url"
                placeholder="岗位链接"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="bg-white/5"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <Label htmlFor="remote" className="cursor-pointer">
                远程工作
              </Label>
              <Switch
                id="remote"
                checked={remote}
                onCheckedChange={setRemote}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="bg-white/5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERESTED">感兴趣</SelectItem>
                  <SelectItem value="APPLIED">已投递</SelectItem>
                  <SelectItem value="INTERVIEWING">面试中</SelectItem>
                  <SelectItem value="OFFER">已 Offer</SelectItem>
                  <SelectItem value="REJECTED">已拒绝</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Parsed Preview */}
        {parsed && (
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="size-4" />
                AI 解析详情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {parsed.summary && (
                <p className="text-sm text-muted-foreground">{parsed.summary}</p>
              )}
              {parsed.skills.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">技能：</span>
                  {parsed.skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              {parsed.education && (
                <p className="text-xs text-muted-foreground">
                  学历要求：{parsed.education}
                </p>
              )}
              {parsed.experience && (
                <p className="text-xs text-muted-foreground">
                  经验要求：{parsed.experience}
                </p>
              )}
              {parsed.benefits.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">福利：</span>
                  {parsed.benefits.map((b, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "添加中..." : "添加岗位"}
          </Button>
          <Link href="/jobs" className={cn(buttonVariants({ variant: "ghost" }))}>
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}
