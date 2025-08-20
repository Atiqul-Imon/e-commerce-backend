import axios from 'axios'
import { ApiError } from './ApiError.js'

// SMS service configuration for Bangladesh
// You can integrate with local SMS providers like:
// - SSL Wireless
// - Bulk SMS BD
// - Twilio (international)
// - or any other Bangladeshi SMS gateway

const SMS_CONFIG = {
  // SSL Wireless configuration (popular in Bangladesh)
  SSL_WIRELESS: {
    url: process.env.SMS_GATEWAY_URL || 'https://sms.sslwireless.com/gwapi/v1/api.php',
    user: process.env.SMS_USER,
    pass: process.env.SMS_PASS,
    sid: process.env.SMS_SID
  },
  
  // Twilio configuration (backup/international)
  TWILIO: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_PHONE_NUMBER
  }
}

// Format phone number for Bangladesh
const formatBangladeshiPhone = (phone) => {
  // Remove any spaces, dashes, or plus signs
  let cleanPhone = phone.replace(/[\s\-\+]/g, '')
  
  // If it starts with 88, it's already formatted
  if (cleanPhone.startsWith('88')) {
    return cleanPhone
  }
  
  // If it starts with 01, add country code
  if (cleanPhone.startsWith('01')) {
    return '88' + cleanPhone
  }
  
  // If it starts with 1, add 880
  if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
    return '880' + cleanPhone
  }
  
  // Return as is if we can't determine format
  return cleanPhone
}

// Send SMS using SSL Wireless (popular Bangladeshi provider)
const sendSMSViaSSLWireless = async (phone, message) => {
  try {
    const formattedPhone = formatBangladeshiPhone(phone)
    
    const params = {
      user: SMS_CONFIG.SSL_WIRELESS.user,
      pass: SMS_CONFIG.SSL_WIRELESS.pass,
      sid: SMS_CONFIG.SSL_WIRELESS.sid,
      sms: {
        0: {
          to: formattedPhone,
          msg: message
        }
      }
    }
    
    const response = await axios.post(SMS_CONFIG.SSL_WIRELESS.url, params, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    console.log('SMS sent via SSL Wireless:', response.data)
    return response.data
    
  } catch (error) {
    console.error('SSL Wireless SMS error:', error.message)
    throw new ApiError(500, 'Failed to send SMS via SSL Wireless')
  }
}

// Send SMS using Twilio (backup option)
const sendSMSViaTwilio = async (phone, message) => {
  try {
    const formattedPhone = '+' + formatBangladeshiPhone(phone)
    
    const accountSid = SMS_CONFIG.TWILIO.accountSid
    const authToken = SMS_CONFIG.TWILIO.authToken
    
    const client = require('twilio')(accountSid, authToken)
    
    const result = await client.messages.create({
      body: message,
      from: SMS_CONFIG.TWILIO.from,
      to: formattedPhone
    })
    
    console.log('SMS sent via Twilio:', result.sid)
    return result
    
  } catch (error) {
    console.error('Twilio SMS error:', error.message)
    throw new ApiError(500, 'Failed to send SMS via Twilio')
  }
}

// Mock SMS service for development
const sendSMSMock = async (phone, message) => {
  console.log('📱 Mock SMS Service')
  console.log('To:', formatBangladeshiPhone(phone))
  console.log('Message:', message)
  console.log('---')
  
  return {
    success: true,
    messageId: 'mock_' + Date.now(),
    phone: formatBangladeshiPhone(phone),
    message
  }
}

// Main SMS sending function
export const sendSMS = async (phone, message) => {
  try {
    // Validate inputs
    if (!phone || !message) {
      throw new ApiError(400, 'Phone number and message are required')
    }
    
    // Validate Bangladeshi phone number format
    const formattedPhone = formatBangladeshiPhone(phone)
    if (!isValidBangladeshiPhone(formattedPhone)) {
      throw new ApiError(400, 'Invalid Bangladeshi phone number format')
    }
    
    // Truncate message if too long (SMS limit is usually 160 characters)
    const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message
    
    // Choose SMS provider based on environment and configuration
    if (process.env.NODE_ENV === 'development' || !SMS_CONFIG.SSL_WIRELESS.user) {
      // Use mock service in development or if SMS credentials are not configured
      return await sendSMSMock(formattedPhone, truncatedMessage)
    } else if (SMS_CONFIG.SSL_WIRELESS.user && SMS_CONFIG.SSL_WIRELESS.pass) {
      // Use SSL Wireless for production (primary choice for Bangladesh)
      return await sendSMSViaSSLWireless(formattedPhone, truncatedMessage)
    } else if (SMS_CONFIG.TWILIO.accountSid && SMS_CONFIG.TWILIO.authToken) {
      // Use Twilio as backup
      return await sendSMSViaTwilio(formattedPhone, truncatedMessage)
    } else {
      // No SMS service configured, use mock
      console.warn('No SMS service configured, using mock service')
      return await sendSMSMock(formattedPhone, truncatedMessage)
    }
    
  } catch (error) {
    console.error('SMS sending failed:', error.message)
    
    // Don't throw error in production to avoid breaking the main flow
    if (process.env.NODE_ENV === 'production') {
      console.error('SMS failed but continuing with main process')
      return { success: false, error: error.message }
    } else {
      throw error
    }
  }
}

// Validate Bangladeshi phone number
const isValidBangladeshiPhone = (phone) => {
  // Remove country code for validation
  const localNumber = phone.replace(/^88/, '')
  
  // Bangladeshi mobile numbers start with 01 and are 11 digits
  const regex = /^01[3-9]\d{8}$/
  return regex.test(localNumber)
}

// Send bulk SMS (for marketing campaigns)
export const sendBulkSMS = async (phoneNumbers, message) => {
  try {
    const results = []
    
    for (const phone of phoneNumbers) {
      try {
        const result = await sendSMS(phone, message)
        results.push({
          phone,
          success: true,
          result
        })
        
        // Add delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        results.push({
          phone,
          success: false,
          error: error.message
        })
      }
    }
    
    return results
    
  } catch (error) {
    console.error('Bulk SMS failed:', error.message)
    throw new ApiError(500, 'Failed to send bulk SMS')
  }
}

// Send OTP SMS
export const sendOTP = async (phone, otp) => {
  const message = `আপনার আরিজান একাউন্ট ভেরিফিকেশন কোড: ${otp}। এই কোডটি কারো সাথে শেয়ার করবেন না। | Your Arizaan verification code: ${otp}. Do not share this code.`
  
  return await sendSMS(phone, message)
}

// Send order confirmation SMS
export const sendOrderConfirmationSMS = async (phone, orderNumber, totalAmount) => {
  const message = `আপনার অর্ডার ${orderNumber} সফলভাবে গ্রহণ করা হয়েছে। মোট: ৳${totalAmount}। ট্র্যাক করুন: ${process.env.FRONTEND_URL}/orders`
  
  return await sendSMS(phone, message)
}

// Send order status update SMS
export const sendOrderStatusSMS = async (phone, orderNumber, status) => {
  const statusMessages = {
    confirmed: `আপনার অর্ডার ${orderNumber} নিশ্চিত করা হয়েছে। শীঘ্রই প্রসেসিং শুরু হবে।`,
    processing: `আপনার অর্ডার ${orderNumber} প্রসেসিং এ আছে। পণ্য প্রস্তুত করা হচ্ছে।`,
    shipped: `আপনার অর্ডার ${orderNumber} পাঠানো হয়েছে। শীঘ্রই ডেলিভার হবে।`,
    delivered: `আপনার অর্ডার ${orderNumber} সফলভাবে ডেলিভার হয়েছে। আরিজানের সাথে কেনাকাটার জন্য ধন্যবাদ!`,
    cancelled: `আপনার অর্ডার ${orderNumber} বাতিল করা হয়েছে। অর্থ ফেরত দেওয়া হবে।`
  }
  
  const message = statusMessages[status] || `আপনার অর্ডার ${orderNumber} এর স্ট্যাটাস আপডেট হয়েছে: ${status}`
  
  return await sendSMS(phone, message)
}

// Functions are already exported individually above
