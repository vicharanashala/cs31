const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const auth = require('../middleware/auth');

// Get all FAQs (public)
router.get('/', async (req, res) => {
  try {
    const faqs = await FAQ.find().sort({ createdAt: -1 });
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching FAQs' });
  }
});

// Create FAQ (authenticated)
router.post('/', auth, async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ message: 'Question and answer are required' });
  }

  try {
    const newFAQ = new FAQ({
      question,
      answer,
      createdBy: req.user.id
    });

    const savedFAQ = await newFAQ.save();
    res.status(201).json(savedFAQ);
  } catch (err) {
    console.error('FAQ Create Error:', err);
    res.status(500).json({ message: 'Error creating FAQ' });
  }
});

// Update FAQ (authenticated)
router.put('/:id', auth, async (req, res) => {
  const { question, answer } = req.body;

  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    faq.updatedAt = Date.now();

    await faq.save();
    res.json(faq);
  } catch (err) {
    console.error('FAQ Update Error:', err);
    res.status(500).json({ message: 'Error updating FAQ' });
  }
});

// Delete FAQ (authenticated)
router.delete('/:id', auth, async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }
    res.json({ message: 'FAQ deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting FAQ' });
  }
});

module.exports = router;