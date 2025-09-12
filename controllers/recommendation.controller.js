import Product from '../models/product.model.js';
import Order from '../models/Order.model.js';
import User from '../models/User.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

// Get product recommendations for a user
export const getUserRecommendations = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    if (!userId) {
      throw new ApiError(401, 'User authentication required');
    }

    const cacheKey = `recommendations:user:${userId}:${limit}`;
    let recommendations = await cache.get(cacheKey);

    if (!recommendations) {
      recommendations = await generateUserRecommendations(userId, parseInt(limit));
      await cache.set(cacheKey, recommendations, 1800); // Cache for 30 minutes
    }

    res.status(200).json(new ApiResponse(200, recommendations, 'User recommendations retrieved'));

  } catch (error) {
    logger.error('Failed to get user recommendations', { error: error.message, userId: req.user?.id });
    throw new ApiError(500, 'Failed to get recommendations');
  }
});

// Get product recommendations based on a product
export const getProductRecommendations = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 8 } = req.query;

    const cacheKey = `recommendations:product:${productId}:${limit}`;
    let recommendations = await cache.get(cacheKey);

    if (!recommendations) {
      recommendations = await generateProductRecommendations(productId, parseInt(limit));
      await cache.set(cacheKey, recommendations, 3600); // Cache for 1 hour
    }

    res.status(200).json(new ApiResponse(200, recommendations, 'Product recommendations retrieved'));

  } catch (error) {
    logger.error('Failed to get product recommendations', { error: error.message, productId: req.params.productId });
    throw new ApiError(500, 'Failed to get product recommendations');
  }
});

// Get trending products
export const getTrendingProducts = asyncHandler(async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const cacheKey = `trending:products:${limit}`;
    let trendingProducts = await cache.get(cacheKey);

    if (!trendingProducts) {
      trendingProducts = await generateTrendingProducts(parseInt(limit));
      await cache.set(cacheKey, trendingProducts, 1800); // Cache for 30 minutes
    }

    res.status(200).json(new ApiResponse(200, trendingProducts, 'Trending products retrieved'));

  } catch (error) {
    logger.error('Failed to get trending products', { error: error.message });
    throw new ApiError(500, 'Failed to get trending products');
  }
});

// Get frequently bought together
export const getFrequentlyBoughtTogether = asyncHandler(async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 5 } = req.query;

    const cacheKey = `frequently-bought:${productId}:${limit}`;
    let recommendations = await cache.get(cacheKey);

    if (!recommendations) {
      recommendations = await generateFrequentlyBoughtTogether(productId, parseInt(limit));
      await cache.set(cacheKey, recommendations, 3600); // Cache for 1 hour
    }

    res.status(200).json(new ApiResponse(200, recommendations, 'Frequently bought together retrieved'));

  } catch (error) {
    logger.error('Failed to get frequently bought together', { error: error.message, productId: req.params.productId });
    throw new ApiError(500, 'Failed to get frequently bought together');
  }
});

// Generate user-based recommendations
const generateUserRecommendations = async (userId, limit) => {
  try {
    // Get user's order history
    const userOrders = await Order.find({ user: userId })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(20);

    if (userOrders.length === 0) {
      // If no order history, return popular products
      return await getPopularProducts(limit);
    }

    // Extract categories and brands from user's purchase history
    const userCategories = new Set();
    const userBrands = new Set();
    const purchasedProducts = new Set();

    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          userCategories.add(item.product.category);
          userBrands.add(item.product.brand);
          purchasedProducts.add(item.product._id.toString());
        }
      });
    });

    // Find similar products based on user's preferences
    const recommendations = await Product.find({
      isActive: true,
      _id: { $nin: Array.from(purchasedProducts) },
      $or: [
        { category: { $in: Array.from(userCategories) } },
        { brand: { $in: Array.from(userBrands) } }
      ]
    })
    .sort({ 'ratings.average': -1, createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();

    return {
      type: 'user_based',
      products: recommendations,
      reason: 'Based on your purchase history'
    };

  } catch (error) {
    logger.error('Failed to generate user recommendations', { error: error.message, userId });
    return await getPopularProducts(limit);
  }
};

// Generate product-based recommendations
const generateProductRecommendations = async (productId, limit) => {
  try {
    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Find similar products by category and brand
    const similarProducts = await Product.find({
      isActive: true,
      _id: { $ne: productId },
      $or: [
        { category: product.category },
        { brand: product.brand }
      ]
    })
    .sort({ 'ratings.average': -1, createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();

    return {
      type: 'product_based',
      products: similarProducts,
      reason: `Similar to ${product.name}`
    };

  } catch (error) {
    logger.error('Failed to generate product recommendations', { error: error.message, productId });
    return { type: 'product_based', products: [], reason: 'No recommendations available' };
  }
};

// Generate trending products
const generateTrendingProducts = async (limit) => {
  try {
    // Get products with high ratings and recent orders
    const trendingProducts = await Product.aggregate([
      {
        $match: {
          isActive: true,
          'ratings.average': { $gte: 4.0 },
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
        }
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'items.product',
          as: 'orders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' },
          trendingScore: {
            $add: [
              { $multiply: ['$ratings.average', 0.7] },
              { $multiply: ['$orderCount', 0.3] }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1 } },
      { $limit: limit },
      {
        $project: {
          __v: 0,
          orders: 0,
          orderCount: 0,
          trendingScore: 0
        }
      }
    ]);

    return {
      type: 'trending',
      products: trendingProducts,
      reason: 'Currently trending products'
    };

  } catch (error) {
    logger.error('Failed to generate trending products', { error: error.message });
    return { type: 'trending', products: [], reason: 'No trending products available' };
  }
};

// Generate frequently bought together
const generateFrequentlyBoughtTogether = async (productId, limit) => {
  try {
    // Find orders that contain this product
    const ordersWithProduct = await Order.find({
      'items.product': productId,
      orderStatus: { $in: ['delivered', 'completed'] }
    }).select('items.product');

    if (ordersWithProduct.length === 0) {
      return { type: 'frequently_bought', products: [], reason: 'No purchase data available' };
    }

    // Count co-occurrences
    const coOccurrences = {};
    ordersWithProduct.forEach(order => {
      order.items.forEach(item => {
        const otherProductId = item.product.toString();
        if (otherProductId !== productId) {
          coOccurrences[otherProductId] = (coOccurrences[otherProductId] || 0) + 1;
        }
      });
    });

    // Get top co-occurring products
    const topCoOccurrences = Object.entries(coOccurrences)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([productId]) => productId);

    const products = await Product.find({
      _id: { $in: topCoOccurrences },
      isActive: true
    })
    .select('-__v')
    .lean();

    // Sort by co-occurrence count
    const sortedProducts = topCoOccurrences.map(id => 
      products.find(product => product._id.toString() === id)
    ).filter(Boolean);

    return {
      type: 'frequently_bought',
      products: sortedProducts,
      reason: 'Frequently bought together'
    };

  } catch (error) {
    logger.error('Failed to generate frequently bought together', { error: error.message, productId });
    return { type: 'frequently_bought', products: [], reason: 'No data available' };
  }
};

// Get popular products (fallback)
const getPopularProducts = async (limit) => {
  try {
    const products = await Product.find({
      isActive: true,
      featured: true
    })
    .sort({ 'ratings.average': -1, createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();

    return {
      type: 'popular',
      products,
      reason: 'Popular products'
    };

  } catch (error) {
    logger.error('Failed to get popular products', { error: error.message });
    return { type: 'popular', products: [], reason: 'No products available' };
  }
};

// Get personalized homepage recommendations
export const getHomepageRecommendations = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const cacheKey = `homepage:recommendations:${userId || 'guest'}`;
    let recommendations = await cache.get(cacheKey);

    if (!recommendations) {
      recommendations = {
        featured: await getPopularProducts(8),
        trending: await generateTrendingProducts(6),
        categories: await getCategoryRecommendations(),
        deals: await getDealRecommendations(6)
      };

      await cache.set(cacheKey, recommendations, 1800); // Cache for 30 minutes
    }

    res.status(200).json(new ApiResponse(200, recommendations, 'Homepage recommendations retrieved'));

  } catch (error) {
    logger.error('Failed to get homepage recommendations', { error: error.message });
    throw new ApiError(500, 'Failed to get homepage recommendations');
  }
});

// Get category recommendations
const getCategoryRecommendations = async () => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$ratings.average' } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    return categories.map(cat => ({
      name: cat._id,
      productCount: cat.count,
      avgRating: Math.round(cat.avgRating * 10) / 10
    }));

  } catch (error) {
    logger.error('Failed to get category recommendations', { error: error.message });
    return [];
  }
};

// Get deal recommendations
const getDealRecommendations = async (limit) => {
  try {
    const deals = await Product.find({
      isActive: true,
      discountPercentage: { $gt: 0 }
    })
    .sort({ discountPercentage: -1, createdAt: -1 })
    .limit(limit)
    .select('-__v')
    .lean();

    return {
      type: 'deals',
      products: deals,
      reason: 'Best deals available'
    };

  } catch (error) {
    logger.error('Failed to get deal recommendations', { error: error.message });
    return { type: 'deals', products: [], reason: 'No deals available' };
  }
};
