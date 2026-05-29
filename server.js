const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/faqs', require('./routes/faq'));
app.use('/api/questions', require('./routes/questions'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Crowdsourced FAQ API is running!', status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});