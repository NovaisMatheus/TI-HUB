ALTER TABLE "User" ADD COLUMN "username" TEXT, ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
INSERT INTO "Permission" ("id", "createdAt", "updatedAt", "key") VALUES
('users_read_20261007', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'users.read'),
('users_write_20261007', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'users.write')
ON CONFLICT ("key") DO NOTHING;
INSERT INTO "RolePermission" ("id", "createdAt", "updatedAt", "roleId", "permissionId")
SELECT 'users_' || md5(r."id" || p."id"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE r."name" = 'ADMINISTRADOR' AND p."key" IN ('users.read', 'users.write')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
