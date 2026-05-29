const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const auth = require('../middleware/auth');
const natural = require('natural');

const SIMILARITY_THRESHOLD = 0.3;
const UPVOTE_THRESHOLD = 3;

const tokenizer = new natural.WordTokenizer();
const TfIdf = natural.TfIdf;
const doc2 = new TfIdf();
const doc1 = new TfIdf();

function preprocessText(str) {
  return str.toLowerCase().trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function calculateTFIDFSimilarity(str1, str2) {
  const s1 = preprocessText(str1);
  const s2 = preprocessText(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.95;
  
  const tfidf = new natural.TfIdf();
  
  tfidf.addDocument(s1);
  tfidf.addDocument(s2);
  
  const terms = new Set([
    ...tokenizer.tokenize(s1),
    ...tokenizer.tokenize(s2)
  ].filter(t => t.length > 2));
  
  if (terms.size === 0) return 0;
  
  const vec1 = [];
  const vec2 = [];
  
  terms.forEach(term => {
    const idx = tfidf.listTerms(0).findIndex(t => t.term === term);
    vec1.push(idx >= 0 ? tfidf.tfidf(term, 0) : 0);
    const idx2 = tfidf.listTerms(1).findIndex(t => t.term === term);
    vec2.push(idx2 >= 0 ? tfidf.tfidf(term, 1) : 0);
  });
  
  const dotProduct = vec1.reduce((sum, v, i) => sum + v * vec2[i], 0);
  const magnitude1 = Math.sqrt(vec1.reduce((sum, v) => sum + v * v, 0));
  const magnitude2 = Math.sqrt(vec2.reduce((sum, v) => sum + v * v, 0));
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

function calculateSimilarity(str1, str2) {
  return calculateTFIDFSimilarity(str1, str2);
}

function findAllSimilarQuestions(questionText, excludeId = null) {
  return new Promise(async (resolve) => {
    try {
      const faqs = await FAQ.find();
      const query = excludeId ? { _id: { $ne: excludeId } } : {};
      const questions = await Question.find(query);
      
      const allSimilar = [];
      
      for (const faq of faqs) {
        const sim = calculateSimilarity(questionText, faq.question);
        if (sim >= SIMILARITY_THRESHOLD) {
          allSimilar.push({ type: 'faq', data: faq, similarity: sim });
        }
      }
      
      for (const q of questions) {
        const sim = calculateSimilarity(questionText, q.question);
        if (sim >= SIMILARITY_THRESHOLD) {
          allSimilar.push({ type: 'question', data: q, similarity: sim });
        }
      }
      
      allSimilar.sort((a, b) => b.similarity - a.similarity);
      resolve(allSimilar.slice(0, 5));
    } catch (err) {
      console.error('Similarity error:', err);
      resolve([]);
    }
  });
}

function findSimilarQuestion(questionText, excludeId = null) {
  return new Promise(async (resolve) => {
    try {
      const allSimilar = await findAllSimilarQuestions(questionText, excludeId);
      resolve(allSimilar.length > 0 ? allSimilar[0] : null);
    } catch (err) {
      resolve(null);
    }
  });
}

router.get('/', async (req, res) => {
  try {
    const questions = await Question.find()
      .populate('createdBy', 'name email')
      .populate('replies.createdBy', 'name email')
      .populate('upvotes', 'name email')
      .sort({ upvoteCount: -1, createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

router.post('/', auth, async (req, res) => {
  const { question } = req.body;
  
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ message: 'Question is required' });
  }
  
  try {
    const allSimilar = await findAllSimilarQuestions(question);
    const bestMatch = allSimilar.length > 0 ? allSimilar[0] : null;
    
    const newQuestion = new Question({
      question: question.trim(),
      createdBy: req.user.id,
      similarity: bestMatch ? bestMatch.similarity : 0,
      similarTo: bestMatch ? bestMatch.data._id : null
    });
    
    await newQuestion.save();
    
    const populatedQuestion = await Question.findById(newQuestion._id)
      .populate('createdBy', 'name email');
    
    if (allSimilar.length > 0) {
      const similarInfo = allSimilar.slice(0, 3).map(s => ({
        similarity: Math.round(s.similarity * 100),
        type: s.type,
        question: s.data.question,
        id: s.data._id
      }));
      return res.status(201).json({
        question: populatedQuestion,
        similarQuestions: similarInfo,
        hasMatch: true
      });
    }
    
    res.status(201).json(populatedQuestion);
  } catch (err) {
    console.error('Question Create Error:', err);
    res.status(500).json({ message: 'Error creating question' });
  }
});

router.post('/:id/upvote', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const alreadyUpvoted = question.upvotes.includes(req.user.id);
    
    if (alreadyUpvoted) {
      question.upvotes = question.upvotes.filter(id => id.toString() !== req.user.id);
      question.upvoteCount = question.upvotes.length;
    } else {
      question.upvotes.push(req.user.id);
      question.upvoteCount = question.upvotes.length;
    }
    
    await question.save();
    
    if (question.upvoteCount >= UPVOTE_THRESHOLD && question.status === 'pending') {
      question.status = 'approved';
      await question.save();
    }
    
    const populatedQuestion = await Question.findById(question._id)
      .populate('createdBy', 'name email')
      .populate('replies.createdBy', 'name email')
      .populate('upvotes', 'name email');
    
    res.json({
      question: populatedQuestion,
      action: alreadyUpvoted ? 'removed' : 'added'
    });
  } catch (err) {
    console.error('Upvote Error:', err);
    res.status(500).json({ message: 'Error upvoting question' });
  }
});

router.post('/:id/reply', auth, async (req, res) => {
  const { text } = req.body;
  
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ message: 'Reply text is required' });
  }
  
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    question.replies.push({
      text: text.trim(),
      createdBy: req.user.id
    });
    
    await question.save();
    
    const populatedQuestion = await Question.findById(question._id)
      .populate('createdBy', 'name email')
      .populate('replies.createdBy', 'name email')
      .populate('upvotes', 'name email');
    
    res.status(201).json(populatedQuestion);
  } catch (err) {
    console.error('Reply Error:', err);
    res.status(500).json({ message: 'Error adding reply' });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const questions = await Question.find({ status: 'pending' })
      .populate('createdBy', 'name email')
      .populate('replies.createdBy', 'name email')
      .sort({ upvoteCount: -1, createdAt: -1 });
    
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending questions' });
  }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    const faq = new FAQ({
      question: question.question,
      answer: req.body.answer || 'Answer to be added',
      createdBy: req.user.id
    });
    
    await faq.save();
    
    question.status = 'approved';
    await question.save();
    
    res.json({ message: 'Question approved and added to FAQ', faq });
  } catch (err) {
    console.error('Approve Error:', err);
    res.status(500).json({ message: 'Error approving question' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting question' });
  }
});

router.post('/check-similarity', auth, async (req, res) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }
  
  try {
    const similar = await findSimilarQuestion(question);
    
    if (similar) {
      res.json({
        hasSimilar: true,
        similarity: similar.similarity,
        type: similar.type,
        similarQuestion: similar.type === 'faq' ? {
          _id: similar.data._id,
          question: similar.data.question
        } : {
          _id: similar.data._id,
          question: similar.data.question,
          upvoteCount: similar.data.upvoteCount
        }
      });
    } else {
      res.json({ hasSimilar: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error checking similarity' });
  }
});

module.exports = router;