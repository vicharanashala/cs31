const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const QuestionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true
  },
  replies: [ReplySchema],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  similarity: {
    type: Number,
    default: 0
  },
  similarTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

QuestionSchema.index({ question: 'text' });
QuestionSchema.index({ similarity: -1 });
QuestionSchema.index({ upvoteCount: -1 });

module.exports = mongoose.model('Question', QuestionSchema);