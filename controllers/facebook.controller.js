import axios from 'axios';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

// Facebook Conversions API configuration
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const FACEBOOK_PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const FACEBOOK_API_VERSION = 'v18.0';

// Facebook Conversions API endpoint
const FACEBOOK_CAPI_URL = `https://graph.facebook.com/${FACEBOOK_API_VERSION}/${FACEBOOK_PIXEL_ID}/events`;

/**
 * Send event to Facebook Conversions API
 */
const sendCAPIEvent = async (eventData) => {
  try {
    if (!FACEBOOK_ACCESS_TOKEN || !FACEBOOK_PIXEL_ID) {
      throw new Error('Facebook CAPI credentials not configured');
    }

    const payload = {
      data: [eventData],
      access_token: FACEBOOK_ACCESS_TOKEN
    };

    const response = await axios.post(FACEBOOK_CAPI_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Facebook CAPI Error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Track PageView event
 */
const trackPageView = asyncHandler(async (req, res) => {
  const { userAgent, url, referrer } = req.body;
  
  const eventData = {
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: userAgent,
      fbc: req.body.fbc, // Facebook click ID if available
      fbp: req.body.fbp  // Facebook browser ID if available
    },
    custom_data: {
      content_name: req.body.content_name || 'Homepage',
      content_category: req.body.content_category || 'General'
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'PageView event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send PageView event', error.message)
    );
  }
});

/**
 * Track ViewContent event
 */
const trackViewContent = asyncHandler(async (req, res) => {
  const { productId, productName, category, value, currency = 'USD' } = req.body;
  
  const eventData = {
    event_name: 'ViewContent',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: req.body.url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.body.userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp
    },
    custom_data: {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      value: value,
      currency: currency
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'ViewContent event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send ViewContent event', error.message)
    );
  }
});

/**
 * Track AddToCart event
 */
const trackAddToCart = asyncHandler(async (req, res) => {
  const { productId, productName, category, value, currency = 'USD', quantity = 1 } = req.body;
  
  const eventData = {
    event_name: 'AddToCart',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: req.body.url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.body.userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp
    },
    custom_data: {
      content_ids: [productId],
      content_name: productName,
      content_category: category,
      value: value,
      currency: currency,
      num_items: quantity
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'AddToCart event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send AddToCart event', error.message)
    );
  }
});

/**
 * Track InitiateCheckout event
 */
const trackInitiateCheckout = asyncHandler(async (req, res) => {
  const { cartItems, totalValue, currency = 'USD' } = req.body;
  
  const eventData = {
    event_name: 'InitiateCheckout',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: req.body.url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.body.userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp
    },
    custom_data: {
      content_ids: cartItems.map(item => item.productId),
      content_type: 'product',
      value: totalValue,
      currency: currency,
      num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0)
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'InitiateCheckout event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send InitiateCheckout event', error.message)
    );
  }
});

/**
 * Track Purchase event
 */
const trackPurchase = asyncHandler(async (req, res) => {
  const { orderId, orderItems, totalValue, currency = 'USD' } = req.body;
  
  const eventData = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: req.body.url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.body.userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp,
      em: req.body.email ? Buffer.from(req.body.email).toString('base64') : undefined
    },
    custom_data: {
      content_ids: orderItems.map(item => item.productId),
      content_type: 'product',
      value: totalValue,
      currency: currency,
      num_items: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      order_id: orderId
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'Purchase event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send Purchase event', error.message)
    );
  }
});

/**
 * Track Lead event
 */
const trackLead = asyncHandler(async (req, res) => {
  const { leadType, value, currency = 'USD' } = req.body;
  
  const eventData = {
    event_name: 'Lead',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: req.body.url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: req.body.userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp,
      em: req.body.email ? Buffer.from(req.body.email).toString('base64') : undefined
    },
    custom_data: {
      content_name: leadType,
      value: value,
      currency: currency
    }
  };

  try {
    const result = await sendCAPIEvent(eventData);
    return res.status(200).json(
      new ApiResponse(200, result, 'Lead event sent successfully')
    );
  } catch (error) {
    return res.status(500).json(
      new ApiError(500, 'Failed to send Lead event', error.message)
    );
  }
});

export {
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackLead
};
