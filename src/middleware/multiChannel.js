const crypto = require('crypto');

function getChannels() {
  try {
    return JSON.parse(process.env.CHANNELS || '[]');
  } catch {
    return [];
  }
}

function verifySignature(rawBody, secret, signature) {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(rawBody)
    .digest('base64');
  return hash === signature;
}

function multiChannelMiddleware(req, res, next) {
  const signature = req.headers['x-line-signature'];
  const rawBody = req.body; // Buffer จาก express.raw

  if (!signature || !rawBody) {
    return res.status(400).json({ error: 'Bad request' });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const destination = parsed.destination;
  const channels = getChannels();
  console.log('Webhook destination:', destination);
  console.log('Known channels:', channels.map(c => c.destination));
  const channel = channels.find(c => c.destination === destination);

  if (!channel) {
    return res.status(403).json({ error: 'Unknown channel' });
  }

  if (!verifySignature(rawBody, channel.secret, signature)) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  req.body = parsed;
  req.channel = channel; // { destination, secret, token, name }
  next();
}

module.exports = { multiChannelMiddleware, getChannels };
