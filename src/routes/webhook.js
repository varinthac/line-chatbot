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

async function handleFileMessage(event, channel) {
  const { replyToken, source, message, timestamp } = event;
  const lineUserId = source.userId;
  const messageId = message.id;
  const messageType = message.type;
  const sentAt = new Date(timestamp);
  const dateStr = dayjs(sentAt).format('YYYY-MM-DD');

  const lineClient = lineService.getClient(channel.token);
  await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: '✅ ได้รับไฟล์แล้ว กำลังจัดเก็บ...' }] });

  const { buffer, contentType } = await lineService.downloadContent(messageId, channel.token);

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
    channelId: channel.destination,
    channelName: channel.name || null,
  });

  console.log('DB save OK:', record.id);

  const webUrl = `${process.env.BASE_URL}/api/files/${record.id}/preview`;
  await lineClient.pushMessage({ to: lineUserId, messages: [{ type: 'text', text: webUrl }] });

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
  res.status(200).end();

  const events = req.body?.events || [];
  console.log(`[webhook] channel=${req.channel?.name} events=${events.length}`);

  for (const event of events) {
    const type = event.message?.type;
    console.log(`[webhook] event.type=${event.type} message.type=${type}`);
    if (event.type !== 'message') continue;
    if (!['image', 'video', 'audio', 'file'].includes(type)) continue;

    handleFileMessage(event, req.channel).catch(err => {
      console.error('handleFileMessage error:', err.message, err.stack);
    });
  }
});

module.exports = router;
