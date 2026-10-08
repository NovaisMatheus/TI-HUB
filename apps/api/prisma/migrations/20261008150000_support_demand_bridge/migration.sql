ALTER TABLE "MaintenanceRecord" ALTER COLUMN "equipmentId" DROP NOT NULL;
ALTER TABLE "MaintenanceRecord" ADD COLUMN "sourceDemandId" TEXT;
CREATE UNIQUE INDEX "MaintenanceRecord_sourceDemandId_key" ON "MaintenanceRecord"("sourceDemandId");
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_sourceDemandId_fkey"
 FOREIGN KEY ("sourceDemandId") REFERENCES "Demand"("id") ON DELETE SET NULL ON UPDATE CASCADE;
