-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "line_user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "drive_web_view_link" TEXT,
    "ocr_text" TEXT,
    "ocr_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "files_line_user_id_idx" ON "files"("line_user_id");
CREATE INDEX "files_file_type_idx" ON "files"("file_type");
CREATE INDEX "files_sent_at_idx" ON "files"("sent_at");
