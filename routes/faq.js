const express = require('express');
const router = express.Router();
const FAQ = require('../models/FAQ');
const auth = require('../middleware/auth');
const { compareQuestions } = require('../utils/duplicateDetection');

// Get all FAQs (public)
router.get('/', async (req, res) => {
  try {
    const { section, search } = req.query;
    let query = {};
    
    if (section) {
      query.section = section;
    }
    
    if (search) {
      query.$text = { $search: search };
    }
    
    const faqs = await FAQ.find(query).sort({ section: 1, createdAt: -1 });
    res.json(faqs);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching FAQs' });
  }
});

// Get distinct sections
router.get('/sections', async (req, res) => {
  try {
    const sections = await FAQ.distinct('section');
    res.json(sections.sort());
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sections' });
  }
});

// Get one FAQ by id
router.get('/:id', async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    res.json(faq);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching FAQ' });
  }
});

// Create FAQ (authenticated)
router.post('/', auth, async (req, res) => {
  const { question, answer, section } = req.body;

  if (!question || !answer || !section) {
    return res.status(400).json({ message: 'Question, answer, and section are required' });
  }

  try {
    const newFAQ = new FAQ({
      question,
      answer,
      section,
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
  const { question, answer, section } = req.body;

  try {
    const faq = await FAQ.findById(req.params.id);
    if (!faq) {
      return res.status(404).json({ message: 'FAQ not found' });
    }

    if (question) faq.question = question;
    if (answer) faq.answer = answer;
    if (section) faq.section = section;
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

// Ask FAQ AI Agent using advanced ensemble similarity matcher (authenticated)
router.post('/ask', auth, async (req, res) => {
  const { question } = req.body;
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ message: 'Question is required' });
  }

  try {
    const faqs = await FAQ.find();
    let bestMatch = null;
    let highestScore = 0;

    for (const faq of faqs) {
      // compareQuestions runs character trigram, dice, overlap, cosine, JW distance, LCS, intent, entity check
      const match = compareQuestions(question, faq.question);
      if (match.score > highestScore) {
        highestScore = match.score;
        bestMatch = { faq, confidence: match.confidence };
      }
    }

    // POSSIBLE_MATCH_THRESHOLD is 0.45, but let's be slightly more flexible (e.g. 0.40) to catch partial fits
    if (bestMatch && highestScore >= 0.40) {
      res.json({
        ok: true,
        answer: bestMatch.faq.answer,
        question: bestMatch.faq.question,
        confidence: bestMatch.confidence,
        score: highestScore
      });
    } else {
      res.json({
        ok: false,
        answer: "I couldn't find a direct FAQ answer for that in our directory. \n\nFeel free to go to the **Post Questions** tab and post your question there. Our team and other students will reply, and if approved, it could be added to our official FAQ index!"
      });
    }
  } catch (err) {
    console.error('FAQ Ask Error:', err);
    res.status(500).json({ message: 'Error processing FAQ chatbot query' });
  }
});

module.exports = router;
