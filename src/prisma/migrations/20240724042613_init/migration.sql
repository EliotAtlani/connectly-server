/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - The primary key for the `UserChannel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `channel_id` on the `UserChannel` table. All the data in the column will be lost.
  - You are about to drop the column `client_offset` on the `UserChannel` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `UserChannel` table. All the data in the column will be lost.
  - You are about to drop the `Channel` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `room` to the `UserChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `UserChannel` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_from_user_fkey";

-- DropForeignKey
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_channel_id_fkey";

-- DropForeignKey
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_user_id_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("username");

-- AlterTable
ALTER TABLE "UserChannel" DROP CONSTRAINT "UserChannel_pkey",
DROP COLUMN "channel_id",
DROP COLUMN "client_offset",
DROP COLUMN "user_id",
ADD COLUMN     "room" TEXT NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ADD CONSTRAINT "UserChannel_pkey" PRIMARY KEY ("username", "room");

-- DropTable
DROP TABLE "Channel";

-- CreateTable
CREATE TABLE "Room" (
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "UserChannel" ADD CONSTRAINT "UserChannel_username_fkey" FOREIGN KEY ("username") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChannel" ADD CONSTRAINT "UserChannel_room_fkey" FOREIGN KEY ("room") REFERENCES "Room"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_from_user_fkey" FOREIGN KEY ("from_user") REFERENCES "User"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "Room"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
