import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log("Users exist, skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.create({
    data: {
      email: "admin@zhiliu.local",
      passwordHash,
      nickname: "管理员",
      role: "ADMIN",
      membershipTier: "PERMANENT_SVIP",
    },
  });

  await prisma.aiConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      modelName: "deepseek-chat",
    },
  });

  console.log("Default admin user and AI config created");
  console.log("  Email: admin@zhiliu.local");
  console.log("  Password: admin123");
  console.log("  Role: ADMIN / PERMANENT_SVIP");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
