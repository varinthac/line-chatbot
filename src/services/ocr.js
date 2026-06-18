const Tesseract = require('tesseract.js');

let worker = null;

async function getWorker() {
  if (!worker) {
    // รองรับภาษาไทย + อังกฤษ
    worker = await Tesseract.createWorker(['tha', 'eng'], 1, {
      logger: () => {},
    });
  }
  return worker;
}

async function extractText(imageBuffer) {
  try {
    const w = await getWorker();
    const { data } = await w.recognize(imageBuffer);
    return data.text?.trim() || '';
  } catch (err) {
    console.error('OCR error:', err.message);
    return null;
  }
}

module.exports = { extractText };
