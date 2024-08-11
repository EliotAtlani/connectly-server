-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "senderId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
