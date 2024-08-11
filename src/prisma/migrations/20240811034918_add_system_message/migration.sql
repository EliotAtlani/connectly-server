/*
  Warnings:

  - You are about to drop the column `senderName` on the `Message` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "MessageType" ADD VALUE 'SYSTEM';

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "senderName";
