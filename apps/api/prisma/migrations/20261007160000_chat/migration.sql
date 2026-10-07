CREATE TABLE "TeamMessage" (
 "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "userId" TEXT NOT NULL, "text" TEXT NOT NULL, "requestId" TEXT NOT NULL,
 CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamMessage_requestId_key" ON "TeamMessage"("requestId");
CREATE INDEX "TeamMessage_createdAt_idx" ON "TeamMessage"("createdAt");
ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "GoogleChatConnection" (
 "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, "userId" TEXT NOT NULL,
 "accessToken" TEXT NOT NULL, "refreshToken" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GoogleChatConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleChatConnection_userId_key" ON "GoogleChatConnection"("userId");
ALTER TABLE "GoogleChatConnection" ADD CONSTRAINT "GoogleChatConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "GoogleOAuthAttempt" (
 "id" TEXT NOT NULL, "stateHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "verifier" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GoogleOAuthAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GoogleOAuthAttempt_stateHash_key" ON "GoogleOAuthAttempt"("stateHash");
INSERT INTO "Permission" ("id", "updatedAt", "key") VALUES ('permission-chat-read', CURRENT_TIMESTAMP, 'chat.read'), ('permission-chat-write', CURRENT_TIMESTAMP, 'chat.write') ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("id", "updatedAt", "roleId", "permissionId")
SELECT 'rp-chat-' || r."id" || '-' || p."id", CURRENT_TIMESTAMP, r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE (r."name" IN ('ADMINISTRADOR', 'TECNICO') AND p."key" IN ('chat.read', 'chat.write')) OR (r."name" = 'CONSULTA' AND p."key" = 'chat.read')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
