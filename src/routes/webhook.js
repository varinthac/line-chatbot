const express = require('express');
const dayjs = require('dayjs');
const { v4: uuidv4 } = require('uuid');

const lineService = require('../services/line');
const storageService = require('../services/storage');
const ocrService = require('../services/ocr');
const db = require('../services/db');

const router = express.Router();

function resolveFileType(messageType) {
  const map = { image: 'image', video: 'video', audio: 'audio', file: 'file' };
  return map[messageType] || 'file';
}

function defaultFileName(fileType, mimeType, timestamp) {
  const ts = dayjs(timestamp).format('YYYYMMDD_HHmmss');
  const extMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/m4a': 'm4a',
    'application/pdf': 'pdf',
  };
  const ext = extMap[mimeType] || fileType;
  return `${fileType}_${ts}.${ext}`;
}

async function handleFileMessage(event) {
  const { replyToken, source, message, timestamp } = event;
  const lineUserId = source.userId;
  const messageId = message.id;
  const messageType = message.type;
  const sentAt = new Date(timestamp);
  const dateStr = dayjs(sentAt).format('YYYY-MM-DD');

  await lineService.replyMessage(replyToken, '✅ ได้รับไฟล์แล้ว กำลังจัดเก็บ...');

  const { buffer, contentType } = await lineService.downloadContent(messageId);

  const fileName = message.fileName || defaultFileName(messageType, contentType, timestamp);
  const fileType = resolveFileType(messageType);

  const { driveFileId, driveWebViewLink } = await storageService.uploadFile({
    buffer,
    fileName,
    mimeType: contentType,
    dateStr,
  });

  console.log('Cloudinary upload OK:', driveFileId);

  const record = await db.saveFile({
    id: uuidv4(),
    lineUserId,
    fileName,
    fileType,
    mimeType: contentType,
    sentAt,
    driveFileId,
    driveWebViewLink,
    ocrStatus: fileType === 'image' ? 'pending' : 'n/a',
  });

  console.log('DB save OK:', record.id);

  if (fileType === 'image') {
    processOcrAsync(record.id, buffer);
  }
}

async function processOcrAsync(fileId, imageBuffer, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ocrText = await ocrService.extractText(imageBuffer);
      await db.updateOcr(fileId, ocrText ?? '', ocrText !== null ? 'done' : 'no_text');
      return;
    } catch (err) {
      console.error(`OCR attempt ${attempt} failed for ${fileId}:`, err.message);
      if (attempt < retries) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  await db.updateOcr(fileId, null, 'failed');
}

router.post('/', (req, res) => {
  // LINE SDK middleware ตรวจ signature ให้แล้ว — ถึงตรงนี้ได้ = valid
  res.status(200).end();

  const events = req.body?.events || [];
  for (const event of events) {
    if (event.type !== 'message') continue;
    const type = event.message?.type;
    if (!['image', 'video', 'audio', 'file'].includes(type)) continue;

    handleFileMessage(event).catch(err => {
      console.error('handleFileMessage error:', err.message);
    });
  }
});

module.exports = router;
