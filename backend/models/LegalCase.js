/**
 * Legal Case Model - MongoDB Schema
 * Tracks legal cases, escalations, and case memory
 */

const mongoose = require('mongoose');

const LegalCaseSchema = new mongoose.Schema({
  // Case Identification
  caseId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // Case Information
  domain: {
    type: String,
    enum: ['criminal', 'civil', 'property', 'family', 'consumer', 'cyber', 'labour', 'tax', 'intellectual', 'motor', 'constitutional', 'corporate'],
    required: true,
    index: true
  },
  
  subDomain: {
    type: String,
    default: null
  },
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  sessionId: {
    type: String,
    index: true
  },
  
  // Case Details
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String
  },
  
  initialQuery: {
    type: String,
    required: true
  },
  
  // Location Information
  location: {
    state: String,
    city: String,
    jurisdiction: String
  },
  
  // Language
  language: {
    type: String,
    enum: ['en', 'hi', 'ur', 'mr', 'ta', 'te', 'bn', 'kn', 'pa', 'ml', 'gu'],
    default: 'en'
  },
  
  // Escalation Information
  escalationStatus: {
    type: String,
    enum: ['pending_review', 'awaiting_escalation', 'escalated', 'assigned_to_lawyer', 'in_progress', 'resolved'],
    default: 'pending_review',
    index: true
  },
  
  escalationReason: String,
  
  escalationDate: Date,
  
  assignedLawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lawyer',
    default: null
  },
  
  // AI Analysis
  aiAnalysis: {
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    
    confidence_feedback: String,
    
    detected_issues: [String],
    
    warnings: [String],
    
    citations: [String],
    
    relevant_acts: [String]
  },
  
  // Case Memory
  conversation_history: [
    {
      timestamp: Date,
      role: String, // 'user' or 'ai'
      message: String,
      metadata: mongoose.Schema.Types.Mixed
    }
  ],
  
  // Evidence & Documents
  documents: [
    {
      name: String,
      url: String,
      uploadedAt: Date,
      type: String // 'notice', 'contract', 'affidavit', etc.
    }
  ],
  
  // Timeline
  timeline: [
    {
      date: Date,
      event: String,
      description: String,
      category: String // 'incident', 'action', 'hearing', etc.
    }
  ],
  
  // Milestones
  status: {
    type: String,
    enum: ['open', 'pending_review', 'assigned', 'in_progress', 'escalated', 'resolved'],
    default: 'open',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['urgent', 'high', 'medium', 'low'],
    default: 'medium',
    index: true
  },
  
  urgencyFlags: {
    is_criminal: Boolean,
    involves_minor: Boolean,
    involves_violence: Boolean,
    time_sensitive: Boolean,
    financial_risk: Boolean
  },
  
  // Outcomes
  resolution: {
    status: String,
    description: String,
    recommendedActions: [String],
    resolvedDate: Date
  },
  
  // Lawyer Recommendations
  lawyerMatches: [
    {
      lawyerId: mongoose.Schema.Types.ObjectId,
      name: String,
      specialization: [String],
      matchScore: Number,
      recommendationReason: String,
      contactInfo: {
        phone: String,
        email: String,
        address: String
      }
    }
  ],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  
  // Case Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  
  tags: [String],
  
  notes: [
    {
      author: String,
      content: String,
      timestamp: Date
    }
  ],
  
  // Analytics
  metrics: {
    queriesCount: { type: Number, default: 0 },
    escalationAttempts: { type: Number, default: 0 },
    lawyerInteractions: { type: Number, default: 0 },
    resolutionDays: Number
  }
}, {
  timestamps: true,
  collection: 'legal_cases'
});

// Indexes for performance
LegalCaseSchema.index({ userId: 1, createdAt: -1 });
LegalCaseSchema.index({ domain: 1, escalationStatus: 1 });
LegalCaseSchema.index({ priority: 1, lastActivityAt: -1 });
LegalCaseSchema.index({ assignedLawyerId: 1, status: 1 });

// Methods
LegalCaseSchema.methods.updateTimeline = function(event, description, category = 'action') {
  this.timeline.push({
    date: new Date(),
    event,
    description,
    category
  });
  this.save();
};

LegalCaseSchema.methods.addConversation = function(role, message, metadata = {}) {
  this.conversation_history.push({
    timestamp: new Date(),
    role,
    message,
    metadata
  });
  this.markModified('conversation_history');
  this.save();
};

LegalCaseSchema.methods.escalaTeToLawyer = function(lawyerId) {
  this.assignedLawyerId = lawyerId;
  this.escalationStatus = 'assigned_to_lawyer';
  this.escalationDate = new Date();
  this.save();
};

LegalCaseSchema.methods.updateStatus = function(newStatus) {
  if (['open', 'pending_review', 'assigned', 'in_progress', 'escalated', 'resolved'].includes(newStatus)) {
    this.status = newStatus;
    this.updatedAt = new Date();
    this.save();
  }
};

module.exports = mongoose.model('LegalCase', LegalCaseSchema);
