const line = require('@line/bot-sdk');
const axios = require('axios');

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient(config);

function getMiddleware() {
  return line.middleware(config);
}

async function downloadContent(messageId) {
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    responseType: 'arraybuffer',
  });
  return {
    buffer: Buffer.from(res.data),
    contentType: res.headers['content-type'] || 'application/octet-stream',
  };
}

async function replyMessage(replyToken, text) {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

module.exports = { getMiddleware, downloadContent, replyMessage };
