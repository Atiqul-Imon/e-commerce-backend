import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters'],
    required: [true, 'Name is required']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    required: [true, 'Email is required'],
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ],
    index: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number (01XXXXXXXXX)'],
    default: ''
  },
  
  // Lead Details
  interest: {
    type: String,
    trim: true,
    maxLength: [200, 'Interest cannot exceed 200 characters'],
    default: ''
  },
  leadType: {
    type: String,
    enum: ['newsletter', 'product_inquiry', 'wholesale', 'partnership', 'support', 'general'],
    default: 'general'
  },
  leadSource: {
    type: String,
    enum: ['website', 'facebook', 'instagram', 'google_ads', 'email_campaign', 'referral', 'organic_search', 'direct'],
    default: 'website'
  },
  
  // Marketing Attribution
  sourcePage: {
    type: String,
    trim: true,
    maxLength: [200, 'Source page cannot exceed 200 characters'],
    default: ''
  },
  utmSource: {
    type: String,
    trim: true,
    default: ''
  },
  utmMedium: {
    type: String,
    trim: true,
    default: ''
  },
  utmCampaign: {
    type: String,
    trim: true,
    default: ''
  },
  utmTerm: {
    type: String,
    trim: true,
    default: ''
  },
  utmContent: {
    type: String,
    trim: true,
    default: ''
  },
  
  // Lead Status & Scoring
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost'],
    default: 'new'
  },
  leadScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Communication Preferences
  consent: {
    type: Boolean,
    required: true,
    default: false
  },
  emailConsent: {
    type: Boolean,
    default: false
  },
  smsConsent: {
    type: Boolean,
    default: false
  },
  marketingConsent: {
    type: Boolean,
    default: false
  },
  
  // Additional Information
  company: {
    type: String,
    trim: true,
    maxLength: [100, 'Company name cannot exceed 100 characters'],
    default: ''
  },
  position: {
    type: String,
    trim: true,
    maxLength: [100, 'Position cannot exceed 100 characters'],
    default: ''
  },
  budget: {
    type: String,
    enum: ['under_1000', '1000_5000', '5000_10000', '10000_50000', 'above_50000', 'not_specified'],
    default: 'not_specified'
  },
  timeline: {
    type: String,
    enum: ['immediate', 'within_week', 'within_month', 'within_quarter', 'not_specified'],
    default: 'not_specified'
  },
  
  // Notes & Communication History
  notes: {
    type: String,
    trim: true,
    maxLength: [1000, 'Notes cannot exceed 1000 characters'],
    default: ''
  },
  communicationHistory: [{
    type: {
      type: String,
      enum: ['email', 'phone', 'sms', 'meeting', 'note'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    outcome: {
      type: String,
      enum: ['positive', 'neutral', 'negative', 'no_response'],
      default: 'neutral'
    }
  }],
  
  // Conversion Tracking
  convertedToCustomer: {
    type: Boolean,
    default: false
  },
  conversionDate: {
    type: Date
  },
  conversionValue: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // System Fields
  lastContacted: {
    type: Date
  },
  nextFollowUp: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  
  // Analytics
  pageViews: {
    type: Number,
    default: 0
  },
  timeOnSite: {
    type: Number, // in seconds
    default: 0
  },
  bounceRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1 });
leadSchema.index({ leadScore: -1 });
leadSchema.index({ priority: 1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ convertedToCustomer: 1 });
leadSchema.index({ nextFollowUp: 1 });

// Virtual for lead age
leadSchema.virtual('leadAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to update lead score
leadSchema.methods.updateLeadScore = function() {
  let score = 0;
  
  // Basic information
  if (this.name) score += 10;
  if (this.email) score += 10;
  if (this.phone) score += 15;
  
  // Engagement
  if (this.pageViews > 0) score += Math.min(this.pageViews * 5, 25);
  if (this.timeOnSite > 300) score += 10; // 5+ minutes
  if (this.communicationHistory.length > 0) score += this.communicationHistory.length * 5;
  
  // Intent signals
  if (this.interest) score += 10;
  if (this.budget !== 'not_specified') score += 15;
  if (this.timeline !== 'not_specified') score += 10;
  
  // Company information
  if (this.company) score += 10;
  if (this.position) score += 5;
  
  this.leadScore = Math.min(score, 100);
  return this.leadScore;
};

// Pre-save middleware to update lead score
leadSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isModified('email') || this.isModified('phone') || 
      this.isModified('interest') || this.isModified('company') || this.isModified('position') ||
      this.isModified('pageViews') || this.isModified('timeOnSite') || this.isModified('communicationHistory')) {
    this.updateLeadScore();
  }
  next();
});

export default mongoose.model('Lead', leadSchema); 