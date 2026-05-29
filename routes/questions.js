const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const FAQ = require('../models/FAQ');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {
  DUPLICATE_CONFIDENCE_THRESHOLD,
  compareQuestions,
  POSSIBLE_MATCH_THRESHOLD
} = require('../utils/duplicateDetection');

const UPVOTE_THRESHOLD = 3;

function hasObjectId(items, userId) {
  if (!items) return false;
  return items.some(id => id.toString() === userId);
}

function removeObjectId(items, userId) {
  if (!items) return [];
  return items.filter(id => id.toString() !== userId);
}

function syncQuestionVoteCounts(question) {
  question.upvotes = question.upvotes || [];
  question.downvotes = question.downvotes || [];
  question.upvoteCount = question.upvotes.length;
  question.downvoteCount = question.downvotes.length;
}

function syncReplyVoteCounts(reply) {
  reply.upvotes = reply.upvotes || [];
  reply.downvotes = reply.downvotes || [];
  reply.upvoteCount = reply.upvotes.length;
  reply.downvoteCount = reply.downvotes.length;
}

function populateQuestion(questionId) {
  return Question.findById(questionId)
    .populate('createdBy', 'name email role')
    .populate('replies.createdBy', 'name email role')
    .populate('replies.upvotes', 'name email')
    .populate('replies.downvotes', 'name email')
    .populate('replies.markedSolutionBy', 'name email role')
    .populate('upvotes', 'name email')
    .populate('downvotes', 'name email');
}

function serializeSimilarMatch(match) {
  return {
    confidence: match.confidence,
    id: match.data._id,
    isDuplicate: match.isDuplicate,
    question: match.data.question,
    reasons: match.reasons,
    similarity: match.confidence,
    score: match.score,
    type: match.type
  };
}

function findAllSimilarQuestions(questionText, excludeId = null) {
  return new Promise(async (resolve) => {
    try {
      const faqs = await FAQ.find();
      const query = excludeId ? { _id: { $ne: excludeId } } : {};
      const questions = await Question.find(query);
      
      const allSimilar = [];
      
      for (const faq of faqs) {
        const match = compareQuestions(questionText, faq.question);
        if (match.score >= POSSIBLE_MATCH_THRESHOLD) {
          allSimilar.push({ type: 'faq', data: faq, ...match });
        }
      }
      
      for (const q of questions) {
        const match = compareQuestions(questionText, q.question);
        if (match.score >= POSSIBLE_MATCH_THRESHOLD) {
          allSimilar.push({ type: 'question', data: q, ...match });
        }
      }
      
      allSimilar.sort((a, b) => b.score - a.score);
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
      .populate('createdBy', 'name email role')
      .populate('replies.createdBy', 'name email role')
      .populate('replies.upvotes', 'name email')
      .populate('replies.downvotes', 'name email')
      .populate('replies.markedSolutionBy', 'name email role')
      .populate('upvotes', 'name email')
      .populate('downvotes', 'name email')
      .sort({ upvoteCount: -1, createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

// Get current user's own questions
router.get('/my', auth, async (req, res) => {
  try {
    const questions = await Question.find({ createdBy: req.user.id })
      .populate('createdBy', 'name email role')
      .populate('replies.createdBy', 'name email role')
      .populate('replies.upvotes', 'name email')
      .populate('replies.downvotes', 'name email')
      .populate('replies.markedSolutionBy', 'name email role')
      .populate('upvotes', 'name email')
      .populate('downvotes', 'name email')
      .sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  const { question, confirmSimilar = false } = req.body;
  
  if (!question || question.trim().length === 0) {
    return res.status(400).json({ message: 'Question is required' });
  }
  
  try {
    const allSimilar = await findAllSimilarQuestions(question);
    const bestMatch = allSimilar.length > 0 ? allSimilar[0] : null;
    const duplicateMatches = allSimilar.filter(match => match.isDuplicate);
    
    if (duplicateMatches.length > 0) {
      return res.status(409).json({
        duplicate: true,
        hasMatch: true,
        message: `Questions more than ${DUPLICATE_CONFIDENCE_THRESHOLD}% similar cannot be posted.`,
        similarQuestions: duplicateMatches.slice(0, 3).map(serializeSimilarMatch)
      });
    }

    if (allSimilar.length > 0 && !confirmSimilar) {
      return res.json({
        hasMatch: true,
        requiresConfirmation: true,
        message: 'Similar questions found. Review them first, then post again if your question is still different.',
        similarQuestions: allSimilar.slice(0, 3).map(serializeSimilarMatch)
      });
    }
    
    const newQuestion = new Question({
      question: question.trim(),
      createdBy: req.user.id,
      similarity: bestMatch ? bestMatch.score : 0,
      similarityPercent: bestMatch ? bestMatch.confidence : 0,
      similarTo: bestMatch ? bestMatch.data._id : null,
      similarToType: bestMatch ? bestMatch.type : null
    });
    
    await newQuestion.save();
    
    const populatedQuestion = await populateQuestion(newQuestion._id);
    
    if (allSimilar.length > 0) {
      return res.status(201).json({
        question: populatedQuestion,
        similarQuestions: allSimilar.slice(0, 3).map(serializeSimilarMatch),
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
    
    const alreadyUpvoted = hasObjectId(question.upvotes, req.user.id);
    
    if (alreadyUpvoted) {
      question.upvotes = removeObjectId(question.upvotes, req.user.id);
    } else {
      question.downvotes = removeObjectId(question.downvotes, req.user.id);
      question.upvotes.push(req.user.id);
    }

    syncQuestionVoteCounts(question);
    
    await question.save();
    
    if (question.upvoteCount >= UPVOTE_THRESHOLD && question.status === 'pending') {
      question.status = 'approved';
      await question.save();
    }
    
    const populatedQuestion = await populateQuestion(question._id);
    
    res.json({
      question: populatedQuestion,
      action: alreadyUpvoted ? 'removed' : 'added'
    });
  } catch (err) {
    console.error('Upvote Error:', err);
    res.status(500).json({ message: 'Error upvoting question' });
  }
});

router.post('/:id/downvote', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const alreadyDownvoted = hasObjectId(question.downvotes, req.user.id);

    if (alreadyDownvoted) {
      question.downvotes = removeObjectId(question.downvotes, req.user.id);
    } else {
      question.upvotes = removeObjectId(question.upvotes, req.user.id);
      question.downvotes.push(req.user.id);
    }

    syncQuestionVoteCounts(question);
    await question.save();

    const populatedQuestion = await populateQuestion(question._id);

    res.json({
      question: populatedQuestion,
      action: alreadyDownvoted ? 'removed' : 'added'
    });
  } catch (err) {
    console.error('Downvote Error:', err);
    res.status(500).json({ message: 'Error downvoting question' });
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
    
    const populatedQuestion = await populateQuestion(question._id);
    
    res.status(201).json(populatedQuestion);
  } catch (err) {
    console.error('Reply Error:', err);
    res.status(500).json({ message: 'Error adding reply' });
  }
});

router.post('/:id/replies/:replyId/upvote', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const reply = question.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const alreadyUpvoted = hasObjectId(reply.upvotes, req.user.id);

    if (alreadyUpvoted) {
      reply.upvotes = removeObjectId(reply.upvotes, req.user.id);
    } else {
      reply.downvotes = removeObjectId(reply.downvotes, req.user.id);
      reply.upvotes.push(req.user.id);
    }

    syncReplyVoteCounts(reply);
    await question.save();

    res.json(await populateQuestion(question._id));
  } catch (err) {
    console.error('Reply Upvote Error:', err);
    res.status(500).json({ message: 'Error upvoting reply' });
  }
});

router.post('/:id/replies/:replyId/downvote', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const reply = question.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const alreadyDownvoted = hasObjectId(reply.downvotes, req.user.id);

    if (alreadyDownvoted) {
      reply.downvotes = removeObjectId(reply.downvotes, req.user.id);
    } else {
      reply.upvotes = removeObjectId(reply.upvotes, req.user.id);
      reply.downvotes.push(req.user.id);
    }

    syncReplyVoteCounts(reply);
    await question.save();

    res.json(await populateQuestion(question._id));
  } catch (err) {
    console.error('Reply Downvote Error:', err);
    res.status(500).json({ message: 'Error downvoting reply' });
  }
});

router.post('/:id/replies/:replyId/solution', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const user = await User.findById(req.user.id);
    const isAsker = question.createdBy?.toString() === req.user.id;
    const isAdmin = user?.role === 'admin';

    if (!isAsker && !isAdmin) {
      return res.status(403).json({ message: 'Only the asker or an admin can mark a solution' });
    }

    const reply = question.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const shouldMark = !reply.isSolution;
    question.replies.forEach(existingReply => {
      existingReply.isSolution = false;
      existingReply.markedSolutionBy = null;
    });
    reply.isSolution = shouldMark;
    reply.markedSolutionBy = shouldMark ? req.user.id : null;

    await question.save();

    res.json(await populateQuestion(question._id));
  } catch (err) {
    console.error('Mark Solution Error:', err);
    res.status(500).json({ message: 'Error marking solution' });
  }
});

router.get('/pending', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    const questions = await Question.find({ status: 'pending' })
      .populate('createdBy', 'name email role')
      .populate('replies.createdBy', 'name email role')
      .populate('replies.upvotes', 'name email')
      .populate('replies.downvotes', 'name email')
      .populate('upvotes', 'name email')
      .populate('downvotes', 'name email')
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
        confidence: similar.confidence,
        isDuplicate: similar.isDuplicate,
        reasons: similar.reasons,
        similarity: similar.score,
        score: similar.score,
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
