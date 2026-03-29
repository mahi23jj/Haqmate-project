/*
  Warnings:

  - You are about to drop the column `areaId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `areaId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `area` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Subcity" AS ENUM ('AddisKetema', 'AkakiKality', 'Arada', 'Bole', 'Gullele', 'Kirkos', 'KolfeKeranio', 'Lideta', 'NifasSilkLafto', 'Yeka');

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_areaId_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_areaId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "areaId";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "areaId",
ADD COLUMN     "Adress" TEXT,
ADD COLUMN     "subcity" "Subcity";

-- DropTable
DROP TABLE "area";
