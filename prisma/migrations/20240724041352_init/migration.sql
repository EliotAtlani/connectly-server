-- AlterTable
ALTER TABLE "User" ALTER COLUMN "is_online" SET DEFAULT false,
ALTER COLUMN "last_ping" SET DEFAULT CURRENT_TIMESTAMP;
