const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'replies.createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  downvoteCount: {
    type: Number,
    default: 0
  },
  isSolution: {
    type: Boolean,
    default: false
  },
  markedSolutionBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'replies.markedSolutionByModel',
    default: null
  },
  markedSolutionByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'replies.reports.reportedByModel',
      required: true
    },
    reportedByModel: {
      type: String,
      enum: ['User', 'Admin'],
      required: true
    },
    reason: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now }
  }]
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
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvoteCount: {
    type: Number,
    default: 0
  },
  similarity: {
    type: Number,
    default: 0
  },
  similarityPercent: {
    type: Number,
    default: 0
  },
  similarTo: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  similarToType: {
    type: String,
    enum: ['faq', 'question', null],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  promotedToFAQ: {
    type: String,
    enum: ['none', 'approved', 'denied'],
    default: 'none'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByModel'
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User'
  },
  reports: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reports.reportedByModel',
      required: true
    },
    reportedByModel: {
      type: String,
      enum: ['User', 'Admin'],
      required: true
    },
    reason: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

QuestionSchema.index({ question: 'text' });
QuestionSchema.index({ similarity: -1 });
QuestionSchema.index({ upvoteCount: -1 });

module.exports = mongoose.model('Question', QuestionSchema);
