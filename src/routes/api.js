const express = require('express');
const db = require('../services/db');
const driveService = require('../services/drive');

const router = express.Router();

// GET /api/files — ค้นหา/กรองพร้อม pagination
router.get('/files', async (req, res) => {
  try {
    const { fileName, fileType, ocrText, lineUserId, dateFrom, dateTo, page, limit } = req.query;
    const result = await db.searchFiles({
      fileName,
      fileType,
      ocrText,
      lineUserId,
      dateFrom,
      dateTo,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json(result);
  } catch (err) {
    console.error('GET /api/files error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/files/:id — ดูข้อมูลไฟล์ชิ้นเดียว
router.get('/files/:id', async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'Not found' });
    res.json(file);
  } catch (err) {
    console.error('GET /api/files/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/files/:id/preview — proxy ไฟล์จาก Google Drive
router.get('/files/:id/preview', async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'Not found' });

    const meta = await driveService.getFileMeta(file.driveFileId);
    const stream = await driveService.getFileStream(file.driveFileId);

    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.fileName)}"`);
    if (meta.size) res.setHeader('Content-Length', meta.size);

    stream.pipe(res);
  } catch (err) {
    console.error('GET /api/files/:id/preview error:', err);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

// GET /api/files/:id/download — ดาวน์โหลดไฟล์
router.get('/files/:id/download', async (req, res) => {
  try {
    const file = await db.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'Not found' });

    const meta = await driveService.getFileMeta(file.driveFileId);
    const stream = await driveService.getFileStream(file.driveFileId);

    res.setHeader('Content-Type', meta.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.fileName)}"`);
    if (meta.size) res.setHeader('Content-Length', meta.size);

    stream.pipe(res);
  } catch (err) {
    console.error('GET /api/files/:id/download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
