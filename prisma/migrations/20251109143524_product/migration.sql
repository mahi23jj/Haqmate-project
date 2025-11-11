-- CreateTable
CREATE TABLE "TeffType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeffType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeffQuality" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TeffQuality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Packaging" (
    "id" TEXT NOT NULL,
    "sizeKg" INTEGER NOT NULL,

    CONSTRAINT "Packaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeffProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePerKg" DOUBLE PRECISION NOT NULL,
    "teffTypeId" TEXT NOT NULL,
    "qualityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeffProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TeffProduct" ADD CONSTRAINT "TeffProduct_teffTypeId_fkey" FOREIGN KEY ("teffTypeId") REFERENCES "TeffType"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeffProduct" ADD CONSTRAINT "TeffProduct_qualityId_fkey" FOREIGN KEY ("qualityId") REFERENCES "TeffQuality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TeffProduct"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
