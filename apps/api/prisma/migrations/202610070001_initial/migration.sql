-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "theme" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "hostname" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "assignedUser" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPERACIONAL',
    "notes" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'LOCAL',
    "glpiId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentNetwork" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT NOT NULL,
    "mac" TEXT NOT NULL DEFAULT '',
    "vlan" TEXT NOT NULL DEFAULT '',
    "gateway" TEXT NOT NULL DEFAULT '',
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "EquipmentNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentHardware" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cpu" TEXT NOT NULL,
    "ram" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,

    CONSTRAINT "EquipmentHardware_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentStatusHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "EquipmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL DEFAULT '',
    "procedure" TEXT NOT NULL DEFAULT '',
    "solution" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "components" TEXT NOT NULL DEFAULT '',
    "referral" TEXT NOT NULL DEFAULT '',
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "equipmentId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "MaintenanceAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'VIGENTE',
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "authorId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalRecommendation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "context" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "appliesWhen" TEXT NOT NULL,
    "doesNotApplyWhen" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'RECOMENDADO',
    "status" TEXT NOT NULL DEFAULT 'VIGENTE',
    "reviewedAt" TIMESTAMP(3),
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "authorId" TEXT NOT NULL,
    "maintenanceId" TEXT,

    CONSTRAINT "TechnicalRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnownSolution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT[],
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "maintenanceId" TEXT,

    CONSTRAINT "KnownSolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "authorId" TEXT NOT NULL,

    CONSTRAINT "ScriptEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalSpecification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VIGENTE',
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "TechnicalSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificationVersion" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "specificationId" TEXT NOT NULL,

    CONSTRAINT "SpecificationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecificationRequirement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "group" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "valueType" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,

    CONSTRAINT "SpecificationRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "departmentId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "requestId" TEXT NOT NULL,
    "specificationVersionId" TEXT NOT NULL,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseProcess" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_ANALISE',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "requestId" TEXT NOT NULL,
    "responsibleId" TEXT NOT NULL,

    CONSTRAINT "PurchaseProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT NOT NULL DEFAULT '',
    "processId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "offeredDescription" TEXT NOT NULL,
    "manufacturerUrl" TEXT NOT NULL DEFAULT '',
    "proposalId" TEXT NOT NULL,
    "requestItemId" TEXT NOT NULL,

    CONSTRAINT "ProposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalAnalysis" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EM_ANALISE',
    "conclusion" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "concludedAt" TIMESTAMP(3),
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "processId" TEXT NOT NULL,
    "proposalItemId" TEXT NOT NULL,
    "specificationVersionId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,

    CONSTRAINT "TechnicalAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisRequirementResult" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDENTE',
    "offered" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL DEFAULT '',
    "equivalenceNotes" TEXT NOT NULL DEFAULT '',
    "analysisId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,

    CONSTRAINT "AnalysisRequirementResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commitment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "number" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'EMITIDO',
    "supplierId" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,

    CONSTRAINT "Commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitmentItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "proposalItemId" TEXT NOT NULL,

    CONSTRAINT "CommitmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalInspection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" TEXT NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT NOT NULL DEFAULT '',
    "commitmentId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,

    CONSTRAINT "TechnicalInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredDescription" TEXT NOT NULL,
    "verifiedCharacteristics" TEXT NOT NULL,
    "divergences" TEXT NOT NULL,
    "result" TEXT NOT NULL DEFAULT 'PENDENTE',
    "inspectionId" TEXT NOT NULL,
    "commitmentItemId" TEXT NOT NULL,

    CONSTRAINT "InspectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "supplierId" TEXT,
    "userId" TEXT NOT NULL,
    "processId" TEXT,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReference" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "dataPolicy" TEXT NOT NULL DEFAULT 'INSTITUTIONAL_ONLY',
    "createdById" TEXT NOT NULL,

    CONSTRAINT "DocumentReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEntry" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "favorite" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SystemEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConfiguration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "model" TEXT NOT NULL DEFAULT 'retrieval-mock',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "encryptedCredential" TEXT,
    "settings" JSONB,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AIConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "conversationId" TEXT NOT NULL,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfiguration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MOCK',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "encryptedCredential" TEXT,
    "settings" JSONB,

    CONSTRAINT "IntegrationConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "sessionIp" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_hostname_key" ON "Equipment"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_assetTag_key" ON "Equipment"("assetTag");

-- CreateIndex
CREATE INDEX "Equipment_departmentId_idx" ON "Equipment"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentNetwork_equipmentId_key" ON "EquipmentNetwork"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentHardware_equipmentId_key" ON "EquipmentHardware"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentStatusHistory_equipmentId_idx" ON "EquipmentStatusHistory"("equipmentId");

-- CreateIndex
CREATE INDEX "EquipmentStatusHistory_userId_idx" ON "EquipmentStatusHistory"("userId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_idx" ON "MaintenanceRecord"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_technicianId_idx" ON "MaintenanceRecord"("technicianId");

-- CreateIndex
CREATE INDEX "MaintenanceAction_recordId_idx" ON "MaintenanceAction"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticle_code_key" ON "KnowledgeArticle"("code");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_authorId_idx" ON "KnowledgeArticle"("authorId");

-- CreateIndex
CREATE INDEX "KnowledgeArticleVersion_articleId_idx" ON "KnowledgeArticleVersion"("articleId");

-- CreateIndex
CREATE INDEX "KnowledgeArticleVersion_authorId_idx" ON "KnowledgeArticleVersion"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeArticleVersion_articleId_version_key" ON "KnowledgeArticleVersion"("articleId", "version");

-- CreateIndex
CREATE INDEX "TechnicalRecommendation_authorId_idx" ON "TechnicalRecommendation"("authorId");

-- CreateIndex
CREATE INDEX "TechnicalRecommendation_maintenanceId_idx" ON "TechnicalRecommendation"("maintenanceId");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_recommendationId_idx" ON "RecommendationFeedback"("recommendationId");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_userId_idx" ON "RecommendationFeedback"("userId");

-- CreateIndex
CREATE INDEX "KnownSolution_maintenanceId_idx" ON "KnownSolution"("maintenanceId");

-- CreateIndex
CREATE INDEX "ScriptEntry_authorId_idx" ON "ScriptEntry"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalSpecification_code_key" ON "TechnicalSpecification"("code");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_responsibleId_idx" ON "TechnicalSpecification"("responsibleId");

-- CreateIndex
CREATE INDEX "SpecificationVersion_specificationId_idx" ON "SpecificationVersion"("specificationId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecificationVersion_specificationId_version_key" ON "SpecificationVersion"("specificationId", "version");

-- CreateIndex
CREATE INDEX "SpecificationRequirement_versionId_idx" ON "SpecificationRequirement"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_cnpj_key" ON "Supplier"("cnpj");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_departmentId_idx" ON "PurchaseRequest"("departmentId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_responsibleId_idx" ON "PurchaseRequest"("responsibleId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_number_year_key" ON "PurchaseRequest"("number", "year");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_requestId_idx" ON "PurchaseRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_specificationVersionId_idx" ON "PurchaseRequestItem"("specificationVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseProcess_number_key" ON "PurchaseProcess"("number");

-- CreateIndex
CREATE INDEX "PurchaseProcess_requestId_idx" ON "PurchaseProcess"("requestId");

-- CreateIndex
CREATE INDEX "PurchaseProcess_responsibleId_idx" ON "PurchaseProcess"("responsibleId");

-- CreateIndex
CREATE INDEX "Proposal_processId_idx" ON "Proposal"("processId");

-- CreateIndex
CREATE INDEX "Proposal_supplierId_idx" ON "Proposal"("supplierId");

-- CreateIndex
CREATE INDEX "ProposalItem_proposalId_idx" ON "ProposalItem"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalItem_requestItemId_idx" ON "ProposalItem"("requestItemId");

-- CreateIndex
CREATE INDEX "TechnicalAnalysis_processId_idx" ON "TechnicalAnalysis"("processId");

-- CreateIndex
CREATE INDEX "TechnicalAnalysis_proposalItemId_idx" ON "TechnicalAnalysis"("proposalItemId");

-- CreateIndex
CREATE INDEX "TechnicalAnalysis_specificationVersionId_idx" ON "TechnicalAnalysis"("specificationVersionId");

-- CreateIndex
CREATE INDEX "TechnicalAnalysis_technicianId_idx" ON "TechnicalAnalysis"("technicianId");

-- CreateIndex
CREATE INDEX "AnalysisRequirementResult_analysisId_idx" ON "AnalysisRequirementResult"("analysisId");

-- CreateIndex
CREATE INDEX "AnalysisRequirementResult_requirementId_idx" ON "AnalysisRequirementResult"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalysisRequirementResult_analysisId_requirementId_key" ON "AnalysisRequirementResult"("analysisId", "requirementId");

-- CreateIndex
CREATE INDEX "Commitment_supplierId_idx" ON "Commitment"("supplierId");

-- CreateIndex
CREATE INDEX "Commitment_processId_idx" ON "Commitment"("processId");

-- CreateIndex
CREATE INDEX "Commitment_requestId_idx" ON "Commitment"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "Commitment_number_year_key" ON "Commitment"("number", "year");

-- CreateIndex
CREATE INDEX "CommitmentItem_commitmentId_idx" ON "CommitmentItem"("commitmentId");

-- CreateIndex
CREATE INDEX "CommitmentItem_proposalItemId_idx" ON "CommitmentItem"("proposalItemId");

-- CreateIndex
CREATE INDEX "TechnicalInspection_commitmentId_idx" ON "TechnicalInspection"("commitmentId");

-- CreateIndex
CREATE INDEX "TechnicalInspection_technicianId_idx" ON "TechnicalInspection"("technicianId");

-- CreateIndex
CREATE INDEX "InspectionItem_inspectionId_idx" ON "InspectionItem"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionItem_commitmentItemId_idx" ON "InspectionItem"("commitmentItemId");

-- CreateIndex
CREATE INDEX "TimelineEvent_supplierId_idx" ON "TimelineEvent"("supplierId");

-- CreateIndex
CREATE INDEX "TimelineEvent_userId_idx" ON "TimelineEvent"("userId");

-- CreateIndex
CREATE INDEX "TimelineEvent_processId_idx" ON "TimelineEvent"("processId");

-- CreateIndex
CREATE INDEX "TimelineEvent_entityType_entityId_occurredAt_idx" ON "TimelineEvent"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "DocumentReference_createdById_idx" ON "DocumentReference"("createdById");

-- CreateIndex
CREATE INDEX "DocumentReference_entityType_entityId_idx" ON "DocumentReference"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AIConfiguration_userId_key" ON "AIConfiguration"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConfiguration_provider_key" ON "IntegrationConfiguration"("provider");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentNetwork" ADD CONSTRAINT "EquipmentNetwork_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentHardware" ADD CONSTRAINT "EquipmentHardware_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentStatusHistory" ADD CONSTRAINT "EquipmentStatusHistory_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentStatusHistory" ADD CONSTRAINT "EquipmentStatusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceAction" ADD CONSTRAINT "MaintenanceAction_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "MaintenanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleVersion" ADD CONSTRAINT "KnowledgeArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleVersion" ADD CONSTRAINT "KnowledgeArticleVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalRecommendation" ADD CONSTRAINT "TechnicalRecommendation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalRecommendation" ADD CONSTRAINT "TechnicalRecommendation_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "TechnicalRecommendation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnownSolution" ADD CONSTRAINT "KnownSolution_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "MaintenanceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptEntry" ADD CONSTRAINT "ScriptEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationVersion" ADD CONSTRAINT "SpecificationVersion_specificationId_fkey" FOREIGN KEY ("specificationId") REFERENCES "TechnicalSpecification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecificationRequirement" ADD CONSTRAINT "SpecificationRequirement_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SpecificationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_specificationVersionId_fkey" FOREIGN KEY ("specificationVersionId") REFERENCES "SpecificationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalItem" ADD CONSTRAINT "ProposalItem_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalItem" ADD CONSTRAINT "ProposalItem_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "PurchaseRequestItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalAnalysis" ADD CONSTRAINT "TechnicalAnalysis_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalAnalysis" ADD CONSTRAINT "TechnicalAnalysis_proposalItemId_fkey" FOREIGN KEY ("proposalItemId") REFERENCES "ProposalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalAnalysis" ADD CONSTRAINT "TechnicalAnalysis_specificationVersionId_fkey" FOREIGN KEY ("specificationVersionId") REFERENCES "SpecificationVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalAnalysis" ADD CONSTRAINT "TechnicalAnalysis_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRequirementResult" ADD CONSTRAINT "AnalysisRequirementResult_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "TechnicalAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisRequirementResult" ADD CONSTRAINT "AnalysisRequirementResult_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "SpecificationRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commitment" ADD CONSTRAINT "Commitment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentItem" ADD CONSTRAINT "CommitmentItem_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitmentItem" ADD CONSTRAINT "CommitmentItem_proposalItemId_fkey" FOREIGN KEY ("proposalItemId") REFERENCES "ProposalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalInspection" ADD CONSTRAINT "TechnicalInspection_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "Commitment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalInspection" ADD CONSTRAINT "TechnicalInspection_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "TechnicalInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionItem" ADD CONSTRAINT "InspectionItem_commitmentItemId_fkey" FOREIGN KEY ("commitmentItemId") REFERENCES "CommitmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReference" ADD CONSTRAINT "DocumentReference_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConfiguration" ADD CONSTRAINT "AIConfiguration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
