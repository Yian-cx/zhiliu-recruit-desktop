import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, checkAILimit, incrementDailyUsage } from "@/lib/guard";
import { z } from "zod";

const jdParseSchema = z.object({
  company: z.string().nullish().default("未知公司"),
  title: z.string().nullish().default("未知职位"),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  location: z.string().nullable(),
  remote: z.boolean().default(false),
  skills: z.array(z.string()).default([]),
  education: z.string().nullable(),
  experience: z.string().nullable(),
  benefits: z.array(z.string()).default([]),
  isOutsourcing: z.boolean().default(false),
  summary: z.string().nullish().default(""),
});

async function parseOneJD(jd: string, config: any, index: number) {
  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: "system",
          content:
            "你是一个专业的招聘专家。请严格按照 JSON 格式返回解析结果，不要包含任何其他文字。",
        },
        {
          role: "user",
          content: `请解析以下岗位描述（JD），提取关键信息。

规则：
- 薪资单位为人民币月薪，数字必须是整数
- 如果JD中没有明确写出薪资，salaryMin 和 salaryMax 设为 null
- 外包识别：注意"外包"、"驻场"、"派遣"、"人力外包"等关键词
- 公司名和职位名从JD中提取
- location 只返回城市名

请严格按照以下 JSON 格式返回，不要包含任何其他内容：

{
  "company": "公司名称",
  "title": "职位名称",
  "salaryMin": 数字或null,
  "salaryMax": 数字或null,
  "location": "城市名或null",
  "remote": true或false,
  "skills": ["技能1", "技能2"],
  "education": "学历要求或null",
  "experience": "经验要求或null",
  "benefits": ["福利1", "福利2"],
  "isOutsourcing": true或false,
  "summary": "一句话总结"
}

JD 原文：
${jd}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    return { index, error: `AI 请求失败 (${res.status})`, rawJd: jd };
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    const parsed = jdParseSchema.safeParse(JSON.parse(jsonStr));
    if (!parsed.success) {
      return { index, error: "解析格式错误", rawJd: jd };
    }
    return { index, rawJd: jd, ...parsed.data };
  } catch {
    return { index, error: "JSON 解析失败", rawJd: jd };
  }
}

export async function POST(req: Request) {
  const { error: authError, user } = await requireAuth();
  if (authError) return authError;

  const limit = await checkAILimit(user.id, user, false);
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message }, { status: 429 });
  }

  const { jdTexts } = await req.json();

  if (!Array.isArray(jdTexts) || jdTexts.length === 0) {
    return NextResponse.json({ error: "请提供至少一条 JD 文本" }, { status: 400 });
  }

  const validJds = jdTexts.filter((jd) => typeof jd === "string" && jd.trim().length >= 10);
  if (validJds.length === 0) {
    return NextResponse.json({ error: "没有有效的 JD 文本（每条至少10个字符）" }, { status: 400 });
  }

  const config = await db.aiConfig.findFirst({ where: { id: "default" } });
  if (!config?.apiKey) {
    return NextResponse.json({ error: "请先配置 AI 服务" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < validJds.length; i++) {
        const result = await parseOneJD(validJds[i], config, i);
        controller.enqueue(encoder.encode(JSON.stringify(result) + "\n"));
      }
      controller.close();
    },
  });

  await incrementDailyUsage(user.id, "aiCalls");

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
