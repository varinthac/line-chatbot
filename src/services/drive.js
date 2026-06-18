const { google } = require('googleapis');
const { Readable } = require('stream');

function getAuthClient() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive']
    );
  }
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/drive']
  );
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}

async function getOrCreateDayFolder(dateStr) {
  const drive = getDriveClient();
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const res = await drive.files.list({
    q: `name='${dateStr}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: dateStr,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });

  return folder.data.id;
}

async function uploadFile({ buffer, fileName, mimeType, dateStr }) {
  const drive = getDriveClient();
  const folderId = await getOrCreateDayFolder(dateStr);

  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  return { driveFileId: res.data.id, driveWebViewLink: res.data.webViewLink };
}

async function getFileStream(driveFileId) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res.data;
}

async function getFileMeta(driveFileId) {
  const drive = getDriveClient();
  const res = await drive.files.get({
    fileId: driveFileId,
    fields: 'id, name, mimeType, size',
  });
  return res.data;
}

module.exports = { uploadFile, getFileStream, getFileMeta };
