-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('REMEMBERED', 'FORGOT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "reviewCount" INTEGER NOT NULL,
    "lastReviewedAt" TIMESTAMP(3) NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "retention" DOUBLE PRECISION NOT NULL,
    "retentionUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" "ReviewOutcome" NOT NULL DEFAULT 'REMEMBERED',
    "retentionBefore" DOUBLE PRECISION,
    "reviewNumber" INTEGER NOT NULL,
    "strengthAfter" DOUBLE PRECISION NOT NULL,
    "intervalDays" INTEGER NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Topic_userId_nextReviewAt_idx" ON "Topic"("userId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "Topic_userId_retention_idx" ON "Topic"("userId", "retention");

-- CreateIndex
CREATE INDEX "Review_topicId_reviewedAt_idx" ON "Review"("topicId", "reviewedAt");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
