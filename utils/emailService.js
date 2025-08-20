import nodemailer from 'nodemailer'
import { ApiError } from './ApiError.js'

// Create nodemailer transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email service (e.g., SendGrid, Mailgun, etc.)
    return nodemailer.createTransporter({
      service: 'gmail', // or your preferred service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
  } else {
    // Development - use Ethereal Email for testing
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    })
  }
}

// Send order confirmation email
export const sendOrderConfirmationEmail = async (email, order, customerName) => {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `"Arizaan" <${process.env.EMAIL_FROM || 'noreply@arizaan.com'}>`,
      to: email,
      subject: `অর্ডার নিশ্চিতকরণ - ${order.orderNumber} | Order Confirmation`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">আরিজান | Arizaan</h1>
              <p style="color: #666; margin: 5px 0;">Modest Fashion for Modern Women</p>
            </div>
            
            <!-- Order Confirmation -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f0f8ff; border-radius: 8px;">
              <h2 style="color: #2563eb; margin: 0;">অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h2>
              <h2 style="color: #2563eb; margin: 5px 0;">Order Confirmed Successfully!</h2>
              <p style="font-size: 18px; font-weight: bold; color: #333; margin: 10px 0;">
                অর্ডার নম্বর | Order #: <span style="color: #2563eb;">${order.orderNumber}</span>
              </p>
            </div>
            
            <!-- Customer Info -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">গ্রাহক তথ্য | Customer Information</h3>
              <p><strong>নাম | Name:</strong> ${customerName}</p>
              <p><strong>ইমেইল | Email:</strong> ${email}</p>
              <p><strong>ঠিকানা | Address:</strong><br>
                ${order.shippingAddress.street}<br>
                ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
                ${order.shippingAddress.country}
              </p>
            </div>
            
            <!-- Order Items -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">অর্ডারকৃত পণ্য | Ordered Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #dee2e6;">পণ্য | Product</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">পরিমাণ | Qty</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">মূল্য | Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map(item => `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #dee2e6;">
                        <div style="display: flex; align-items: center;">
                          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; margin-right: 10px;">
                          <div>
                            <strong>${item.name}</strong>
                            ${item.selectedColor ? `<br><small>রঙ | Color: ${item.selectedColor}</small>` : ''}
                            ${item.selectedSize ? `<br><small>সাইজ | Size: ${item.selectedSize}</small>` : ''}
                          </div>
                        </div>
                      </td>
                      <td style="padding: 10px; text-align: center; border: 1px solid #dee2e6;">${item.quantity}</td>
                      <td style="padding: 10px; text-align: right; border: 1px solid #dee2e6;">৳${(item.price * item.quantity).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <!-- Order Summary -->
            <div style="margin-bottom: 25px; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <h3 style="color: #333; margin-top: 0;">অর্ডার সারাংশ | Order Summary</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>সাবটোটাল | Subtotal:</span>
                <span>৳${order.subtotal.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>ডেলিভারি চার্জ | Shipping:</span>
                <span>৳${order.shippingCost.toLocaleString()}</span>
              </div>
              ${order.discount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #dc3545;">
                  <span>ছাড় | Discount:</span>
                  <span>-৳${order.discount.toLocaleString()}</span>
                </div>
              ` : ''}
              <hr style="border: none; border-top: 2px solid #dee2e6; margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #2563eb;">
                <span>মোট | Total:</span>
                <span>৳${order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
            
            <!-- Payment Info -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">পেমেন্ট তথ্য | Payment Information</h3>
              <p><strong>পেমেন্ট পদ্ধতি | Payment Method:</strong> ${getPaymentMethodName(order.paymentMethod.type)}</p>
              <p><strong>পেমেন্ট স্ট্যাটাস | Payment Status:</strong> 
                <span style="color: ${order.paymentStatus === 'paid' ? '#28a745' : '#ffc107'};">
                  ${getPaymentStatusName(order.paymentStatus)}
                </span>
              </p>
            </div>
            
            <!-- Delivery Info -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">ডেলিভারি তথ্য | Delivery Information</h3>
              <p><strong>আনুমানিক ডেলিভারি | Estimated Delivery:</strong> ${new Date(order.estimatedDelivery).toLocaleDateString('bn-BD')}</p>
              <p><strong>ডেলিভারি স্লট | Delivery Slot:</strong> ${order.deliverySlot || 'যেকোনো সময় | Anytime'}</p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
              <p style="color: #666; margin: 5px 0;">
                অর্ডার ট্র্যাক করতে ভিজিট করুন | Track your order at:<br>
                <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="color: #2563eb; text-decoration: none;">
                  ${process.env.FRONTEND_URL}/orders/${order._id}
                </a>
              </p>
              <p style="color: #666; margin: 15px 0;">
                কোনো সমস্যা হলে যোগাযোগ করুন | For any queries, contact us:<br>
                <strong>ফোন | Phone:</strong> +880 1234-567890<br>
                <strong>ইমেইল | Email:</strong> support@arizaan.com
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                আরিজানের সাথে কেনাকাটার জন্য ধন্যবাদ!<br>
                Thank you for shopping with Arizaan!
              </p>
            </div>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Order confirmation email sent:', info.messageId)
    
    return info
  } catch (error) {
    console.error('Error sending order confirmation email:', error)
    throw new ApiError(500, 'Failed to send order confirmation email')
  }
}

// Send order status update email
export const sendOrderStatusUpdateEmail = async (email, order, customerName) => {
  try {
    const transporter = createTransporter()
    
    const statusMessages = {
      pending: { bn: 'অপেক্ষমান', en: 'Pending' },
      confirmed: { bn: 'নিশ্চিত', en: 'Confirmed' },
      processing: { bn: 'প্রসেসিং', en: 'Processing' },
      shipped: { bn: 'পাঠানো হয়েছে', en: 'Shipped' },
      delivered: { bn: 'ডেলিভার হয়েছে', en: 'Delivered' },
      cancelled: { bn: 'বাতিল', en: 'Cancelled' }
    }
    
    const currentStatus = statusMessages[order.orderStatus] || { bn: order.orderStatus, en: order.orderStatus }
    
    const mailOptions = {
      from: `"Arizaan" <${process.env.EMAIL_FROM || 'noreply@arizaan.com'}>`,
      to: email,
      subject: `অর্ডার আপডেট - ${order.orderNumber} | Order Update`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #333; margin: 0;">আরিজান | Arizaan</h1>
              <p style="color: #666; margin: 5px 0;">Modest Fashion for Modern Women</p>
            </div>
            
            <!-- Status Update -->
            <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #f0f8ff; border-radius: 8px;">
              <h2 style="color: #2563eb; margin: 0;">অর্ডার স্ট্যাটাস আপডেট!</h2>
              <h2 style="color: #2563eb; margin: 5px 0;">Order Status Update!</h2>
              <p style="font-size: 18px; font-weight: bold; color: #333; margin: 10px 0;">
                অর্ডার নম্বর | Order #: <span style="color: #2563eb;">${order.orderNumber}</span>
              </p>
              <p style="font-size: 16px; color: #333; margin: 10px 0;">
                বর্তমান স্ট্যাটাস | Current Status: 
                <span style="color: #28a745; font-weight: bold;">${currentStatus.bn} | ${currentStatus.en}</span>
              </p>
            </div>
            
            ${order.trackingNumber ? `
              <div style="text-align: center; margin-bottom: 25px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
                <p style="margin: 0; font-size: 16px;">
                  <strong>ট্র্যাকিং নম্বর | Tracking Number:</strong> 
                  <span style="color: #2563eb; font-weight: bold;">${order.trackingNumber}</span>
                </p>
              </div>
            ` : ''}
            
            <!-- Order Summary -->
            <div style="margin-bottom: 25px;">
              <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">অর্ডার সারাংশ | Order Summary</h3>
              <p><strong>মোট পণ্য | Total Items:</strong> ${order.items.length}</p>
              <p><strong>মোট মূল্য | Total Amount:</strong> ৳${order.totalAmount.toLocaleString()}</p>
              <p><strong>পেমেন্ট স্ট্যাটাস | Payment Status:</strong> 
                <span style="color: ${order.paymentStatus === 'paid' ? '#28a745' : '#ffc107'};">
                  ${getPaymentStatusName(order.paymentStatus)}
                </span>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
              <p style="color: #666; margin: 5px 0;">
                অর্ডার ট্র্যাক করতে ভিজিট করুন | Track your order at:<br>
                <a href="${process.env.FRONTEND_URL}/orders/${order._id}" style="color: #2563eb; text-decoration: none;">
                  ${process.env.FRONTEND_URL}/orders/${order._id}
                </a>
              </p>
              <p style="color: #666; margin: 15px 0;">
                কোনো সমস্যা হলে যোগাযোগ করুন | For any queries, contact us:<br>
                <strong>ফোন | Phone:</strong> +880 1234-567890<br>
                <strong>ইমেইল | Email:</strong> support@arizaan.com
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                আরিজানের সাথে কেনাকাটার জন্য ধন্যবাদ!<br>
                Thank you for shopping with Arizaan!
              </p>
            </div>
          </div>
        </div>
      `
    }
    
    const info = await transporter.sendMail(mailOptions)
    console.log('Order status update email sent:', info.messageId)
    
    return info
  } catch (error) {
    console.error('Error sending order status update email:', error)
    throw new ApiError(500, 'Failed to send order status update email')
  }
}

// Helper functions
const getPaymentMethodName = (type) => {
  const methods = {
    cash_on_delivery: 'ক্যাশ অন ডেলিভারি | Cash on Delivery',
    bkash: 'বিকাশ | bKash',
    nagad: 'নগদ | Nagad',
    rocket: 'রকেট | Rocket',
    bank_transfer: 'ব্যাংক ট্রান্সফার | Bank Transfer',
    card: 'কার্ড | Card Payment'
  }
  return methods[type] || type
}

const getPaymentStatusName = (status) => {
  const statuses = {
    pending: 'অপেক্ষমান | Pending',
    awaiting_payment: 'পেমেন্ট অপেক্ষমান | Awaiting Payment',
    paid: 'পরিশোধিত | Paid',
    failed: 'ব্যর্থ | Failed',
    refunded: 'ফেরত | Refunded'
  }
  return statuses[status] || status
}

// Functions are already exported individually above
