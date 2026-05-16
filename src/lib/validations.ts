import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(6, "密码至少 6 位"),
});

export const registerSchema = z
  .object({
    email: z.string().email("请输入有效的邮箱地址").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    code: z.string().min(4, "请输入验证码"),
    password: z.string().min(6, "密码至少 6 位"),
    confirmPassword: z.string(),
    nickname: z.string().min(1, "请输入昵称").optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: "手机号和邮箱至少填写一项",
    path: ["email"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const jobSchema = z.object({
  company: z.string().min(1, "请输入公司名称"),
  title: z.string().min(1, "请输入职位名称"),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  jd: z.string().min(1, "请输入岗位描述"),
  onboardingContent: z.string().optional(),
  status: z.string().default("INTERESTED"),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  isFavorite: z.boolean().default(false),
  matchScore: z.number().int().min(0).max(100).nullable().optional(),
});

export const resumeSchema = z.object({
  name: z.string().min(1, "请输入简历名称"),
  content: z.string().default(""),
  isDefault: z.boolean().default(false),
});

export const offerSchema = z.object({
  jobId: z.string().min(1, "请选择岗位"),
  company: z.string().min(1, "请输入公司名称"),
  title: z.string().min(1, "请输入职位名称"),
  salary: z.number().min(1, "请输入月薪"),
  salaryMonth: z.number().default(12),
  benefits: z.string().optional(),
  notes: z.string().optional(),
});

export const noteSchema = z.object({
  jobId: z.string().min(1, "请选择岗位"),
  content: z.string().default(""),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1, "请输入标题"),
  description: z.string().optional(),
  type: z.string().default("CUSTOM"),
  startAt: z.string().min(1),
  endAt: z.string().min(1),
  jobId: z.string().optional(),
});

export const profileSchema = z.object({
  nickname: z.string().min(1, "请输入昵称").optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6, "新密码至少 6 位"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });

export const aiConfigSchema = z.object({
  apiKey: z.string().min(1, "请输入 API Key"),
  baseUrl: z.string().url("请输入有效的 URL"),
  modelName: z.string().min(1, "请输入模型名称"),
});
