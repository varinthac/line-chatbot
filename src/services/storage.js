const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = 'files';

function sanitizeFileName(fileName) {
  const ext = fileName.match(/\.[^/.]+$/)?.[0] || '';
  const base = fileName.slice(0, fileName.length - ext.length);
  const safe = base
    .replace(/[^\w\-]/g, '_')  // แทนทุกอักขระที่ไม่ใช่ a-z 0-9 _ - ด้วย _
    .replace(/_+/g, '_')        // ลด __ ซ้ำๆ เหลือ _
    .slice(0, 80);              // จำกัดความยาว
  return safe + ext;
}

async function uploadFile({ buffer, fileName, mimeType, dateStr }) {
  const safeName = sanitizeFileName(fileName);
  const path = `${dateStr}/${Date.now()}_${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw error;

  return {
    driveFileId: data.path,
    driveWebViewLink: `${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${data.path}`,
  };
}

async function getFileStream(filePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filePath);

  if (error) throw error;

  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { Readable } = require('stream');
  const stream = Readable.from(buffer);

  return { stream, contentType: data.type || 'application/octet-stream' };
}

async function deleteFile(filePath) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) throw error;
}

module.exports = { uploadFile, getFileStream, deleteFile };
