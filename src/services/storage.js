const cloudinary = require('cloudinary').v2;
const axios = require('axios');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getResourceType(mimeType) {
  if (!mimeType) return 'auto';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'video';
  return 'raw';
}

async function uploadFile({ buffer, fileName, mimeType, dateStr }) {
  const resourceType = getResourceType(mimeType);

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `line-chatbot/${dateStr}`,
        public_id: fileName.replace(/\.[^/.]+$/, ''),
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  return {
    driveFileId: result.public_id,
    driveWebViewLink: result.secure_url,
  };
}

async function getFileStream(publicId, resourceType = 'auto') {
  const url = cloudinary.url(publicId, { resource_type: resourceType, secure: true });
  const res = await axios.get(url, { responseType: 'stream' });
  return { stream: res.data, contentType: res.headers['content-type'] };
}

async function deleteFile(publicId, resourceType = 'image') {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { uploadFile, getFileStream, deleteFile };
