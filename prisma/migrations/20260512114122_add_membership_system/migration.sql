-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'WEEKLY_VIP', 'MONTHLY_VIP', 'YEARLY_VIP', 'PERMANENT_SVIP');

-- AlterTable
ALTER TABLE "AiConfig" ADD COLUMN     "vipModelName" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "membershipExpiresAt" TIMESTAMP(3),
ADD COLUMN     "membershipTier" "MembershipTier" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "personalApiKey" TEXT,
ADD COLUMN     "personalBaseUrl" TEXT,
ADD COLUMN     "personalModelName" TEXT;

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "aiCalls" INTEGER NOT NULL DEFAULT 0,
    "interviews" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_userId_date_key" ON "UsageRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
