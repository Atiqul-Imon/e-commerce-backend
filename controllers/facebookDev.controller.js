import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * Dummy Facebook CAPI controller for development
 * Logs events instead of sending to Facebook
 */

// Track PageView event (dummy)
const trackPageView = asyncHandler(async (req, res) => {
  const { userAgent, url, referrer } = req.body;
  
  console.log('🎭 DUMMY CAPI PageView Event:', {
    event_name: 'PageView',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: url,
    user_data: {
      client_ip_address: req.ip,
      client_user_agent: userAgent,
      fbc: req.body.fbc,
      fbp: req.body.fbp
    },
    custom_data: {
      content_name: req.body.content_name || 'Homepage',
      content_category: req.body.content_category || 'General'
    }
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy PageView event logged')
  );
});

// Track ViewContent event (dummy)
const trackViewContent = asyncHandler(async (req, res) => {
  const { productId, productName, category, value, currency = 'USD' } = req.body;
  
  console.log('🎭 DUMMY CAPI ViewContent Event:', {
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
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy ViewContent event logged')
  );
});

// Track AddToCart event (dummy)
const trackAddToCart = asyncHandler(async (req, res) => {
  const { productId, productName, category, value, currency = 'USD', quantity = 1 } = req.body;
  
  console.log('🎭 DUMMY CAPI AddToCart Event:', {
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
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy AddToCart event logged')
  );
});

// Track InitiateCheckout event (dummy)
const trackInitiateCheckout = asyncHandler(async (req, res) => {
  const { cartItems, totalValue, currency = 'USD' } = req.body;
  
  console.log('🎭 DUMMY CAPI InitiateCheckout Event:', {
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
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy InitiateCheckout event logged')
  );
});

// Track Purchase event (dummy)
const trackPurchase = asyncHandler(async (req, res) => {
  const { orderId, orderItems, totalValue, currency = 'USD' } = req.body;
  
  console.log('🎭 DUMMY CAPI Purchase Event:', {
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
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy Purchase event logged')
  );
});

// Track Lead event (dummy)
const trackLead = asyncHandler(async (req, res) => {
  const { leadType, value, currency = 'USD' } = req.body;
  
  console.log('🎭 DUMMY CAPI Lead Event:', {
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
  });

  return res.status(200).json(
    new ApiResponse(200, { 
      events_received: 1, 
      messages: ['Dummy event logged successfully'],
      fbtrace_id: 'dummy-trace-id-' + Date.now()
    }, 'Dummy Lead event logged')
  );
});

export {
  trackPageView,
  trackViewContent,
  trackAddToCart,
  trackInitiateCheckout,
  trackPurchase,
  trackLead
};
