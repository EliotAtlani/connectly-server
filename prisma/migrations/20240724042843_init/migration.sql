/*
  Warnings:

  - You are about to drop the column `channel_id` on the `Message` table. All the data in the column will be lost.
  - Added the required column `room` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_channel_id_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "channel_id",
ADD COLUMN     "room" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_room_fkey" FOREIGN KEY ("room") REFERENCES "Room"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
