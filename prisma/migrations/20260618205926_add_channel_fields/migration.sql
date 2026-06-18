-- AlterTable
ALTER TABLE "files" ADD COLUMN     "channel_id" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "channel_name" TEXT;

-- CreateIndex
CREATE INDEX "files_channel_id_idx" ON "files"("channel_id");
