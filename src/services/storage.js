const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Map MIME type → Cloudinary resource_type
function getResourceType(mimeType) {
  if (!mimeType) return 'auto';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'video'; // Cloudinary handles audio under 'video'
  return 'raw';
}

async function uploadFile({ buffer, fileName, mimeType, dateStr }) {
  const resourceType = getResourceType(mimeType);

  const result = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: `line-chatbot/${dateStr}`,
        public_id: fileName.replace(/\.[^/.]+$/, ''), // ชื่อไฟล์ไม่รวม extension
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
    driveFileId: result.public_id,       // ใช้ public_id แทน drive file id
    driveWebViewLink: result.secure_url, // URL ของไฟล์
  };
}

async function getFileStream(publicId, resourceType = 'auto') {
  const axios = require('axios');
  const url = cloudinary.url(publicId, { resource_type: resourceType, secure: true });
  const res = await axios.get(url, { responseType: 'stream' });
  return { stream: res.data, contentType: res.headers['content-type'] };
}

async function getFileUrl(publicId, resourceType = 'auto') {
  return cloudinary.url(publicId, { resource_type: resourceType, secure: true });
}

module.exports = { uploadFile, getFileStream, getFileUrl };
