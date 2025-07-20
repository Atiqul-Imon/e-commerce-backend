import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    price: {
      type: Number,
      required: true
    },
    variant: {
      name: String,
      value: String
    },
    image: {
      type: String,
      required: true
    }
  }],
  shippingAddress: {
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'Bangladesh'
    },
    phone: {
      type: String,
      required: true
    }
  },
  billingAddress: {
    type: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home'
    },
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'Bangladesh'
    },
    phone: {
      type: String,
      required: true
    }
  },
  paymentInfo: {
    id: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: true
    },
    method: {
      type: String,
      required: true,
      enum: ['stripe', 'paypal', 'bkash', 'nagad', 'cod']
    },
    transactionId: String,
    paidAt: Date
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'bkash', 'nagad', 'cod']
  },
  itemsPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  taxPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  shippingPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  orderStatus: {
    type: String,
    required: true,
    default: 'Processing',
    enum: [
      'Processing',
      'Confirmed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
      'Refunded',
      'Returned'
    ]
  },
  orderNotes: {
    type: String,
    maxLength: [500, 'Order notes cannot exceed 500 characters']
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  trackingUrl: {
    type: String,
    trim: true
  },
  estimatedDelivery: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancellationReason: {
    type: String,
    maxLength: [200, 'Cancellation reason cannot exceed 200 characters']
  },
  refundInfo: {
    amount: {
      type: Number,
      default: 0
    },
    reason: {
      type: String,
      maxLength: [200, 'Refund reason cannot exceed 200 characters']
    },
    processedAt: {
      type: Date
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  digitalFiles: [{
    name: String,
    url: String,
    downloadCount: {
      type: Number,
      default: 0
    }
  }],
  couponApplied: {
    code: String,
    discount: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for order status timeline
orderSchema.virtual('statusTimeline').get(function() {
  const timeline = [];
  
  if (this.createdAt) {
    timeline.push({
      status: 'Order Placed',
      date: this.createdAt,
      description: 'Order has been placed successfully'
    });
  }
  
  if (this.orderStatus === 'Confirmed' || this.orderStatus === 'Shipped' || 
      this.orderStatus === 'Out for Delivery' || this.orderStatus === 'Delivered') {
    timeline.push({
      status: 'Order Confirmed',
      date: this.updatedAt,
      description: 'Order has been confirmed and is being processed'
    });
  }
  
  if (this.orderStatus === 'Shipped' || this.orderStatus === 'Out for Delivery' || 
      this.orderStatus === 'Delivered') {
    timeline.push({
      status: 'Order Shipped',
      date: this.updatedAt,
      description: 'Order has been shipped'
    });
  }
  
  if (this.orderStatus === 'Out for Delivery' || this.orderStatus === 'Delivered') {
    timeline.push({
      status: 'Out for Delivery',
      date: this.updatedAt,
      description: 'Order is out for delivery'
    });
  }
  
  if (this.orderStatus === 'Delivered' && this.deliveredAt) {
    timeline.push({
      status: 'Delivered',
      date: this.deliveredAt,
      description: 'Order has been delivered successfully'
    });
  }
  
  if (this.orderStatus === 'Cancelled' && this.cancelledAt) {
    timeline.push({
      status: 'Cancelled',
      date: this.cancelledAt,
      description: `Order has been cancelled${this.cancellationReason ? `: ${this.cancellationReason}` : ''}`
    });
  }
  
  return timeline;
});

// Virtual for total items count
orderSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Indexes for better query performance
orderSchema.index({ user: 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ paymentInfo: { status: 1 } });
orderSchema.index({ isActive: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  next();
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.itemsPrice = this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    this.totalPrice = this.itemsPrice + this.taxPrice + this.shippingPrice;
  }
  next();
});

export default mongoose.model('Order', orderSchema); 