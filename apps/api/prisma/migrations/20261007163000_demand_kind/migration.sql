ALTER TABLE "Demand" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'SUPORTE';
CREATE INDEX "Demand_kind_idx" ON "Demand"("kind");
