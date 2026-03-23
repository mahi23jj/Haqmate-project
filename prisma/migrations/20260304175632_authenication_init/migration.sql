/*
  Warnings:

  - A unique constraint covering the columns `[phoneNumber]` on the table `user` will be added. If there are existing duplicate values, this will fail.
  - Made the column `phoneNumber` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "user_email_key";

-- AlterTable
ALTER TABLE "user" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phoneNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");
