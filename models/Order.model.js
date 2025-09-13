import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest checkout
  },
  
  // Guest checkout customer info
  customerInfo: {
    name: {
      type: String,
      required: function() { return !this.user },
      trim: true,
      maxLength: [100, 'Customer name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: false, // Made optional
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      required: function() { return !this.user },
      match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
    }
  },
  
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative']
    },
    selectedColor: {
      type: String,
      trim: true
    },
    selectedSize: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      required: true
    }
  }],
  
  shippingAddress: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: true,
      match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxLength: [200, 'Address cannot exceed 200 characters']
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxLength: [50, 'Area cannot exceed 50 characters']
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxLength: [50, 'City cannot exceed 50 characters']
    },
    country: {
      type: String,
      required: true,
      default: 'Bangladesh',
      trim: true
    }
  },
  
  billingAddress: {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: [100, 'Name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      required: true,
      match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxLength: [200, 'Address cannot exceed 200 characters']
    },
    area: {
      type: String,
      required: true,
      trim: true,
      maxLength: [50, 'Area cannot exceed 50 characters']
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxLength: [50, 'City cannot exceed 50 characters']
    },
    country: {
      type: String,
      required: true,
      default: 'Bangladesh',
      trim: true
    }
  },
  
  // Enhanced payment method for Bangladeshi market
  paymentMethod: {
    type: {
      type: String,
      enum: ['cash_on_delivery', 'cod', 'bkash', 'nagad', 'rocket', 'bank_transfer', 'card'],
      required: true
    },
    // Mobile banking details (bKash, Nagad, Rocket)
    mobileNumber: {
      type: String,
      match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladeshi mobile number']
    },
    transactionId: String,
    
    // Bank transfer details
    bankName: String,
    accountNumber: String,
    accountHolderName: String,
    
    // Card details
    cardLast4: String,
    cardBrand: String,
    
    // Additional payment info
    reference: String,
    instructions: String
  },
  
  paymentStatus: {
    type: String,
    enum: ['pending', 'awaiting_payment', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Enhanced pricing structure
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: [0, 'Shipping cost cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  
  // Bangladeshi market specific fields
  deliverySlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  estimatedDelivery: {
    type: Date
  },
  trackingNumber: {
    type: String,
    sparse: true,
    index: true
  },
  courierService: {
    type: String,
    enum: ['pathao', 'steadfast', 'redx', 'paperfly', 'sundarban', 'sa_paribahan', 'own_delivery'],
    default: 'own_delivery'
  },
  
  // Order management
  notes: {
    type: String,
    maxLength: [500, 'Notes cannot exceed 500 characters']
  },
  adminNotes: {
    type: String,
    maxLength: [1000, 'Admin notes cannot exceed 1000 characters']
  },
  promoCode: {
    type: String,
    maxLength: [20, 'Promo code cannot exceed 20 characters']
  },
  
  // Timestamps
  paidAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: {
    type: String,
    maxLength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  
  // Customer service
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerReview: {
    type: String,
    maxLength: [500, 'Customer review cannot exceed 500 characters']
  },
  
  // Internal tracking
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Return/refund management
  returnRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    requestedAt: Date,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending'
    },
    refundAmount: {
      type: Number,
      min: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ 'customerInfo.phone': 1 });
orderSchema.index({ createdAt: -1 });

// Virtual for order age
orderSchema.virtual('orderAge').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // in days
});

// Virtual for customer name (works for both authenticated and guest users)
orderSchema.virtual('customerName').get(function() {
  if (this.user && this.user.name) {
    return this.user.name;
  }
  return this.customerInfo ? this.customerInfo.name : 'Guest Customer';
});

// Virtual for customer email (works for both authenticated and guest users)
orderSchema.virtual('customerEmail').get(function() {
  if (this.user && this.user.email) {
    return this.user.email;
  }
  return this.customerInfo ? this.customerInfo.email : null;
});

// Virtual for customer phone (works for both authenticated and guest users)
orderSchema.virtual('customerPhone').get(function() {
  if (this.user && this.user.phone) {
    return this.user.phone;
  }
  return this.customerInfo ? this.customerInfo.phone : null;
});

// Pre-save middleware
orderSchema.pre('save', function(next) {
  // Auto-generate order number if not provided
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `ARZ${timestamp}${random}`;
  }
  
  // Set estimated delivery if not provided
  if (!this.estimatedDelivery && this.shippingAddress) {
    const today = new Date();
    let deliveryDays = 3; // Default 3 days
    
    // Bangladeshi major cities delivery time
    const majorCities = ['dhaka', 'chittagong', 'sylhet', 'rajshahi', 'khulna', 'barisal'];
    const cityLower = this.shippingAddress.city?.toLowerCase() || '';
    
    if (majorCities.some(majorCity => cityLower.includes(majorCity))) {
      deliveryDays = 1; // Next day delivery for major cities
    }
    
    this.estimatedDelivery = new Date(today.getTime() + (deliveryDays * 24 * 60 * 60 * 1000));
  }
  
  next();
});

// Methods
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'confirmed', 'processing'];
  return cancellableStatuses.includes(this.orderStatus);
};

orderSchema.methods.isDelivered = function() {
  return this.orderStatus === 'delivered';
};

orderSchema.methods.isPaid = function() {
  return this.paymentStatus === 'paid';
};

orderSchema.methods.addInternalNote = function(note, userId) {
  this.internalNotes.push({
    note,
    addedBy: userId,
    addedAt: new Date()
  });
  return this.save();
};

// Static methods
orderSchema.statics.getOrderStats = function(startDate, endDate) {
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$totalAmount' },
        averageOrderValue: { $avg: '$totalAmount' },
        totalItemsSold: { 
          $sum: { 
            $sum: '$items.quantity' 
          } 
        }
      }
    }
  ]);
};

const Order = mongoose.model('Order', orderSchema);

export default Order;