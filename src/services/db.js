const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function saveFile(data) {
  return prisma.file.create({ data });
}

async function updateOcr(id, ocrText, status = 'done') {
  return prisma.file.update({
    where: { id },
    data: { ocrText, ocrStatus: status },
  });
}

async function searchFiles({ fileName, fileType, ocrText, lineUserId, channelId, dateFrom, dateTo, page = 1, limit = 20 }) {
  const where = {};

  if (fileName) {
    where.fileName = { contains: fileName, mode: 'insensitive' };
  }
  if (fileType) {
    where.fileType = fileType;
  }
  if (ocrText) {
    where.ocrText = { contains: ocrText, mode: 'insensitive' };
  }
  if (lineUserId) {
    where.lineUserId = { contains: lineUserId, mode: 'insensitive' };
  }
  if (channelId) {
    where.channelId = channelId;
  }
  if (dateFrom || dateTo) {
    where.sentAt = {};
    if (dateFrom) where.sentAt.gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.sentAt.lte = end;
    }
  }

  const skip = (page - 1) * limit;
  const [total, files] = await Promise.all([
    prisma.file.count({ where }),
    prisma.file.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        lineUserId: true,
        fileName: true,
        fileType: true,
        mimeType: true,
        sentAt: true,
        driveFileId: true,
        driveWebViewLink: true,
        ocrText: true,
        ocrStatus: true,
        channelId: true,
        channelName: true,
        createdAt: true,
      },
    }),
  ]);

  return { total, page, limit, files };
}

async function getFileById(id) {
  return prisma.file.findUnique({ where: { id } });
}

async function deleteFile(id) {
  return prisma.file.delete({ where: { id } });
}

async function listChannels() {
  return prisma.file.findMany({
    distinct: ['channelId'],
    select: { channelId: true, channelName: true },
    orderBy: { channelName: 'asc' },
  });
}

module.exports = { saveFile, updateOcr, searchFiles, getFileById, deleteFile, listChannels };
