const vision = require('@google-cloud/vision');

let client;

function getClient() {
  if (!client) {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      client = new vision.ImageAnnotatorClient({ credentials });
    } else {
      // fallback: ใช้ GOOGLE_APPLICATION_CREDENTIALS path
      client = new vision.ImageAnnotatorClient();
    }
  }
  return client;
}

async function extractText(imageBuffer) {
  try {
    const visionClient = getClient();
    const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });
    const detections = result.textAnnotations;

    if (!detections || detections.length === 0) {
      return '';
    }

    // detections[0] คือ full text ที่รวมทั้งหมด
    return detections[0].description?.trim() || '';
  } catch (err) {
    console.error('OCR error:', err.message);
    return null;
  }
}

module.exports = { extractText };
