const mongoose = require('mongoose');
const dotenv = require('dotenv');
const FAQ = require('./models/FAQ');
const Question = require('./models/Question');

const dns = require('node:dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected');

    const faqs = await FAQ.find();
    console.log('FAQs in database:', faqs.map(f => ({ id: f._id, question: f.question, section: f.section })));

    const questions = await Question.find();
    console.log('Questions in database:', questions.map(q => ({ id: q._id, question: q.question, status: q.status, promotedToFAQ: q.promotedToFAQ })));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
