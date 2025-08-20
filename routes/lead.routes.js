import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middleware/validate.middleware.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import Lead from '../models/Lead.model.js';

const router = express.Router();

// Validation rules for lead submission
const leadValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('consent').isBoolean().withMessage('Consent is required'),
];

// Validation for lead updates
const leadUpdateValidation = [
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'unqualified', 'converted', 'lost']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('leadType').optional().isIn(['newsletter', 'product_inquiry', 'wholesale', 'partnership', 'support', 'general']),
  body('leadSource').optional().isIn(['website', 'facebook', 'instagram', 'google_ads', 'email_campaign', 'referral', 'organic_search', 'direct']),
];

// @route   POST /api/leads
// @desc    Collect a new lead
// @access  Public
router.post('/', leadValidation, validateRequest, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      phone, 
      interest, 
      consent, 
      sourcePage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      leadType,
      leadSource,
      company,
      position,
      budget,
      timeline,
      emailConsent,
      smsConsent,
      marketingConsent
    } = req.body;

    // Check if lead already exists
    const existingLead = await Lead.findOne({ email });
    if (existingLead) {
      // Update existing lead with new information
      existingLead.name = name;
      existingLead.phone = phone || existingLead.phone;
      existingLead.interest = interest || existingLead.interest;
      existingLead.consent = consent;
      existingLead.sourcePage = sourcePage || existingLead.sourcePage;
      existingLead.utmSource = utmSource || existingLead.utmSource;
      existingLead.utmMedium = utmMedium || existingLead.utmMedium;
      existingLead.utmCampaign = utmCampaign || existingLead.utmCampaign;
      existingLead.utmTerm = utmTerm || existingLead.utmTerm;
      existingLead.utmContent = utmContent || existingLead.utmContent;
      existingLead.leadType = leadType || existingLead.leadType;
      existingLead.leadSource = leadSource || existingLead.leadSource;
      existingLead.company = company || existingLead.company;
      existingLead.position = position || existingLead.position;
      existingLead.budget = budget || existingLead.budget;
      existingLead.timeline = timeline || existingLead.timeline;
      existingLead.emailConsent = emailConsent !== undefined ? emailConsent : existingLead.emailConsent;
      existingLead.smsConsent = smsConsent !== undefined ? smsConsent : existingLead.smsConsent;
      existingLead.marketingConsent = marketingConsent !== undefined ? marketingConsent : existingLead.marketingConsent;
      
      await existingLead.save();
      
      res.status(200).json({ 
        success: true, 
        message: 'Lead updated successfully', 
        lead: existingLead 
      });
    } else {
      // Create new lead
      const lead = await Lead.create({ 
        name, 
        email, 
        phone, 
        interest, 
        consent, 
        sourcePage,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
        leadType,
        leadSource,
        company,
        position,
        budget,
        timeline,
        emailConsent,
        smsConsent,
        marketingConsent
      });
      
      res.status(201).json({ 
        success: true, 
        message: 'Lead collected successfully', 
        lead 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/leads
// @desc    Get all leads with filtering and pagination (admin only)
// @access  Admin
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      leadType,
      leadSource,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (leadType) filter.leadType = leadType;
    if (leadSource) filter.leadSource = leadSource;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { interest: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const leads = await Lead.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Lead.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({ 
      success: true, 
      leads,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLeads: total,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/leads/:id
// @desc    Get single lead by ID (admin only)
// @access  Admin
router.get('/admin/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    res.status(200).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/leads/:id
// @desc    Update lead (admin only)
// @access  Admin
router.put('/admin/:id', protect, authorize('admin'), leadUpdateValidation, validateRequest, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Update lead fields
    Object.keys(req.body).forEach(key => {
      if (lead[key] !== undefined) {
        lead[key] = req.body[key];
      }
    });

    // Update last contacted if status is being updated
    if (req.body.status && req.body.status !== lead.status) {
      lead.lastContacted = new Date();
    }

    await lead.save();
    
    res.status(200).json({ success: true, message: 'Lead updated successfully', lead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/leads/:id/communication
// @desc    Add communication history to lead (admin only)
// @access  Admin
router.post('/admin/:id/communication', protect, authorize('admin'), [
  body('type').isIn(['email', 'phone', 'sms', 'meeting', 'note']).withMessage('Valid communication type required'),
  body('content').notEmpty().withMessage('Communication content is required'),
  body('outcome').optional().isIn(['positive', 'neutral', 'negative', 'no_response'])
], validateRequest, async (req, res) => {
  try {
    const { type, content, outcome = 'neutral' } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.communicationHistory.push({
      type,
      content,
      outcome,
      date: new Date()
    });

    lead.lastContacted = new Date();
    await lead.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Communication history added successfully', 
      lead 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/leads/:id/convert
// @desc    Convert lead to customer (admin only)
// @access  Admin
router.post('/admin/:id/convert', protect, authorize('admin'), [
  body('conversionValue').optional().isNumeric().withMessage('Conversion value must be a number')
], validateRequest, async (req, res) => {
  try {
    const { conversionValue = 0 } = req.body;
    
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    lead.status = 'converted';
    lead.convertedToCustomer = true;
    lead.conversionDate = new Date();
    lead.conversionValue = conversionValue;
    
    await lead.save();
    
    res.status(200).json({ 
      success: true, 
      message: 'Lead converted successfully', 
      lead 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/leads/analytics/overview
// @desc    Get lead analytics overview (admin only)
// @access  Admin
router.get('/admin/analytics/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalLeads,
      newLeads,
      convertedLeads,
      leadsBySource,
      leadsByType,
      averageLeadScore,
      conversionRate
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, status: 'new' }),
      Lead.countDocuments({ ...filter, convertedToCustomer: true }),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$leadSource', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$leadType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: null, avgScore: { $avg: '$leadScore' } } }
      ]),
      Lead.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: { $sum: { $cond: ['$convertedToCustomer', 1, 0] } }
          }
        }
      ])
    ]);

    const analytics = {
      totalLeads,
      newLeads,
      convertedLeads,
      leadsBySource,
      leadsByType,
      averageLeadScore: averageLeadScore[0]?.avgScore || 0,
      conversionRate: conversionRate[0] ? (conversionRate[0].converted / conversionRate[0].total * 100) : 0
    };

    res.status(200).json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/leads/analytics/trends
// @desc    Get lead trends over time (admin only)
// @access  Admin
router.get('/admin/analytics/trends', protect, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const trends = await Lead.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 },
          converted: { $sum: { $cond: ['$convertedToCustomer', 1, 0] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/leads/:id
// @desc    Delete lead (admin only)
// @access  Admin
router.delete('/admin/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    
    res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router; 