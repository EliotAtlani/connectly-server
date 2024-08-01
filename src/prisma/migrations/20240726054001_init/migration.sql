/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `UserChannel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `username` on the `UserChannel` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `UserChannel` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_from_user_fkey";

-- DropForeignKey
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_username_fkey";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_pkey",
DROP COLUMN "username",
ADD COLUMN     "user_id" TEXT NOT NULL,
ADD CONSTRAINT "UserChannel_pkey" PRIMARY KEY ("user_id", "room");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- AddForeignKey
ALTER TABLE "UserChannel" ADD CONSTRAINT "UserChannel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
