const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const dbUrl = process.env.DATABASE_URL || "file:./zhiliu.db";
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log("Users exist, skipping seed.");
    return;
  }

  const hash = bcrypt.hashSync("admin123", 12);
  await prisma.user.create({
    data: {
      email: "admin@zhiliu.local",
      passwordHash: hash,
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
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
