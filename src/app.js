require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const webhookRouter = require('./routes/webhook');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan('combined'));

// Webhook route — multi-channel signature verification
const { multiChannelMiddleware } = require('./middleware/multiChannel');
app.use('/webhook', express.raw({ type: 'application/json' }), multiChannelMiddleware, webhookRouter);

// API routes ใช้ JSON parser ปกติ
app.use('/api', express.json(), apiRouter);

// Serve static frontend
app.use(express.static(path.join(__dirname, '../web/public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
