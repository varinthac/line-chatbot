const line = require('@line/bot-sdk');
const axios = require('axios');

function getClient(channelAccessToken) {
  return new line.messagingApi.MessagingApiClient({ channelAccessToken });
}

async function downloadContent(messageId, channelAccessToken) {
  const token = channelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const url = `https://api-data.line.me/v2/bot/message/${messageId}/content`;
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
  });
  return {
    buffer: Buffer.from(res.data),
    contentType: res.headers['content-type'] || 'application/octet-stream',
  };
}

module.exports = { getClient, downloadContent };
