-- CreateTable
CREATE TABLE "JobComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobIds" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offerIds" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferComparison_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "JobComparison" ADD CONSTRAINT "JobComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferComparison" ADD CONSTRAINT "OfferComparison_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
