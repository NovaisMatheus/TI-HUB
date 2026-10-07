CREATE TABLE "ExtensionCredential" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3), "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL, CONSTRAINT "ExtensionCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExtensionCredential_tokenHash_key" ON "ExtensionCredential"("tokenHash");
CREATE INDEX "ExtensionCredential_userId_idx" ON "ExtensionCredential"("userId");
ALTER TABLE "ExtensionCredential" ADD CONSTRAINT "ExtensionCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "Demand" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "sourceHost" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL, "number" TEXT NOT NULL, "documentType" TEXT NOT NULL,
  "title" TEXT NOT NULL, "description" TEXT NOT NULL, "requester" TEXT NOT NULL,
  "sourceStatus" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'ABERTA', "notes" TEXT NOT NULL DEFAULT '',
  "dataPolicy" TEXT NOT NULL DEFAULT 'NO_AI', "capturedAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL, CONSTRAINT "Demand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Demand_sourceHost_sourceId_key" ON "Demand"("sourceHost", "sourceId");
CREATE INDEX "Demand_status_idx" ON "Demand"("status");
CREATE TABLE "DemandDispatch" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "demandId" TEXT NOT NULL, "sourceId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL, "title" TEXT NOT NULL, "author" TEXT NOT NULL,
  "dateLabel" TEXT NOT NULL, "content" TEXT NOT NULL, "metadata" JSONB NOT NULL,
  CONSTRAINT "DemandDispatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DemandDispatch_demandId_sourceId_key" ON "DemandDispatch"("demandId", "sourceId");
ALTER TABLE "DemandDispatch" ADD CONSTRAINT "DemandDispatch_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "DemandSnapshot" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "demandId" TEXT NOT NULL, "capturedBy" TEXT NOT NULL, "capturedAt" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL, CONSTRAINT "DemandSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DemandSnapshot_demandId_idx" ON "DemandSnapshot"("demandId");
ALTER TABLE "DemandSnapshot" ADD CONSTRAINT "DemandSnapshot_demandId_fkey" FOREIGN KEY ("demandId") REFERENCES "Demand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "Permission" ("id", "updatedAt", "key") VALUES ('permission-demands-read', CURRENT_TIMESTAMP, 'demands.read'), ('permission-demands-write', CURRENT_TIMESTAMP, 'demands.write') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("id", "updatedAt", "roleId", "permissionId")
SELECT 'rp-demands-' || r."id" || '-' || p."id", CURRENT_TIMESTAMP, r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE (r."name" IN ('ADMINISTRADOR', 'TECNICO') AND p."key" IN ('demands.read', 'demands.write')) OR (r."name" = 'CONSULTA' AND p."key" = 'demands.read')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
