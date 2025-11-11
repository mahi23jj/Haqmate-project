/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `TeffQuality` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `TeffType` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TeffQuality_name_key" ON "TeffQuality"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TeffType_name_key" ON "TeffType"("name");
