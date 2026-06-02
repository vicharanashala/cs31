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

const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const seedAdmins = async () => {
  try {
    const defaultAdmins = [
      {
        name: 'Super Admin',
        email: 'admin@study.iitm.ac.in',
        password: 'admin123'
      },
      {
        name: 'Bipin Tiwari (Admin)',
        email: 'bipintiwari486001@gmail.com',
        password: 'admin123'
      },
      {
        name: 'VLED Admin',
        email: 'admin@vled.in',
        password: 'test123'
      }
    ];

    for (const data of defaultAdmins) {
      const exists = await Admin.findOne({ email: data.email });
      if (!exists) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const newAdmin = new Admin({
          name: data.name,
          email: data.email,
          password: hashedPassword
        });
        await newAdmin.save();
        console.log(`✅ Admin seeded: ${data.email}`);
      }
    }
  } catch (err) {
    console.error('❌ Error seeding default admins:', err);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    seedAdmins();
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/faqs', require('./routes/faq'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Crowdsourced FAQ API is running!', status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});