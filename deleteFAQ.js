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

    const questionText = 'What is this internship about?';
    
    // 1. Delete FAQ
    const faq = await FAQ.findOneAndDelete({ question: questionText });
    if (faq) {
      console.log(`Deleted FAQ: "${faq.question}"`);
    } else {
      console.log('No FAQ found matching that question.');
    }

    // 2. Reset original question status
    const question = await Question.findOne({ question: questionText });
    if (question) {
      question.status = 'pending';
      question.promotedToFAQ = 'none';
      await question.save();
      console.log(`Reset question "${question.question}" status to pending and promotedToFAQ to none.`);
    } else {
      console.log('No community question found matching that text.');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
