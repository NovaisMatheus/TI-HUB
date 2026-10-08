ALTER TABLE "PurchaseRequest" ALTER COLUMN "departmentId" DROP NOT NULL;
ALTER TABLE "PurchaseRequestItem" ALTER COLUMN "quantity" DROP NOT NULL;
ALTER TABLE "PurchaseProcess" ADD COLUMN "sourceDemandId" TEXT;
CREATE UNIQUE INDEX "PurchaseProcess_sourceDemandId_key" ON "PurchaseProcess"("sourceDemandId");
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_sourceDemandId_fkey" FOREIGN KEY ("sourceDemandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentReference" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'OUTRO';
ALTER TABLE "AnalysisRequirementResult" ADD COLUMN "referenceUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
