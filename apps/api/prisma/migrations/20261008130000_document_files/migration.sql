CREATE TABLE "DocumentFile" (
 "id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "data" BYTEA NOT NULL,
 "extractedText" TEXT NOT NULL, "extractionStatus" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "DocumentReference" ADD COLUMN "fileId" TEXT;
ALTER TABLE "DocumentReference" ADD CONSTRAINT "DocumentReference_fileId_fkey"
 FOREIGN KEY ("fileId") REFERENCES "DocumentFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
