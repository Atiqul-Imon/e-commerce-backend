import Product from '../models/product.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';

// Advanced product search
export const searchProducts = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      q: searchQuery,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      inStock,
      featured,
      trending,
      bestSeller,
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build search criteria
    const searchCriteria = {
      isActive: true
    };

    // Text search
    if (searchQuery) {
      searchCriteria.$text = { $search: searchQuery };
    }

    // Category filter
    if (category) {
      searchCriteria.category = { $regex: category, $options: 'i' };
    }

    // Brand filter
    if (brand) {
      searchCriteria.brand = { $regex: brand, $options: 'i' };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      searchCriteria.price = {};
      if (minPrice) searchCriteria.price.$gte = parseFloat(minPrice);
      if (maxPrice) searchCriteria.price.$lte = parseFloat(maxPrice);
    }

    // Rating filter
    if (rating) {
      searchCriteria['ratings.average'] = { $gte: parseFloat(rating) };
    }

    // Stock filter
    if (inStock === 'true') {
      searchCriteria.stock = { $gt: 0 };
    }

    // Feature filters
    if (featured === 'true') searchCriteria.featured = true;
    if (trending === 'true') searchCriteria.trending = true;
    if (bestSeller === 'true') searchCriteria.bestSeller = true;

    // Build sort criteria
    let sortCriteria = {};
    switch (sortBy) {
      case 'price':
        sortCriteria.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'rating':
        sortCriteria['ratings.average'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'newest':
        sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'relevance':
      default:
        if (searchQuery) {
          sortCriteria.score = { $meta: 'textScore' };
        } else {
          sortCriteria.createdAt = -1;
        }
        break;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Generate cache key
    const cacheKey = cache.keys.products({
      searchCriteria,
      sortCriteria,
      page,
      limit
    });

    // Try to get from cache first
    let cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Search cache hit', { cacheKey });
      return res.status(200).json(new ApiResponse(200, cachedResult, 'Search results retrieved from cache'));
    }

    // Execute search query
    const products = await Product.find(searchCriteria)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    // Get search suggestions
    const suggestions = await generateSearchSuggestions(searchQuery, category, brand);

    // Get filter options
    const filterOptions = await getFilterOptions(searchCriteria);

    const searchResult = {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
        limit: parseInt(limit)
      },
      suggestions,
      filterOptions,
      searchQuery: searchQuery || '',
      appliedFilters: {
        category,
        brand,
        minPrice,
        maxPrice,
        rating,
        inStock,
        featured,
        trending,
        bestSeller
      }
    };

    // Cache the result for 5 minutes
    await cache.set(cacheKey, searchResult, 300);

    const duration = Date.now() - startTime;
    logger.performance('Product search', duration, {
      query: searchQuery,
      resultsCount: products.length,
      totalProducts
    });

    res.status(200).json(new ApiResponse(200, searchResult, 'Search completed successfully'));

  } catch (error) {
    logger.error('Search failed', { error: error.message, query: req.query });
    throw new ApiError(500, 'Search failed');
  }
});

// Generate search suggestions (helper function)
const generateSearchSuggestions = async (searchQuery, category, brand) => {
  try {
    const suggestions = {
      categories: [],
      brands: [],
      products: []
    };

    if (searchQuery) {
      // Get category suggestions
      const categoryAgg = await Product.aggregate([
        { $match: { isActive: true, category: { $regex: searchQuery, $options: 'i' } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      suggestions.categories = categoryAgg.map(item => item._id);

      // Get brand suggestions
      const brandAgg = await Product.aggregate([
        { $match: { isActive: true, brand: { $regex: searchQuery, $options: 'i' } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      suggestions.brands = brandAgg.map(item => item._id);

      // Get product name suggestions
      const productAgg = await Product.aggregate([
        { $match: { isActive: true, name: { $regex: searchQuery, $options: 'i' } } },
        { $project: { name: 1, _id: 1 } },
        { $limit: 5 }
      ]);
      suggestions.products = productAgg.map(item => ({ name: item.name, id: item._id }));
    }

    return suggestions;
  } catch (error) {
    logger.error('Failed to get search suggestions', { error: error.message });
    return { categories: [], brands: [], products: [] };
  }
};

// Get filter options
const getFilterOptions = async (searchCriteria) => {
  try {
    const options = {
      categories: [],
      brands: [],
      priceRange: { min: 0, max: 0 },
      ratings: []
    };

    // Get categories
    const categories = await Product.aggregate([
      { $match: { ...searchCriteria, category: { $exists: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    options.categories = categories.map(item => ({ name: item._id, count: item.count }));

    // Get brands
    const brands = await Product.aggregate([
      { $match: { ...searchCriteria, brand: { $exists: true } } },
      { $group: { _id: '$brand', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    options.brands = brands.map(item => ({ name: item._id, count: item.count }));

    // Get price range
    const priceStats = await Product.aggregate([
      { $match: searchCriteria },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
    ]);
    if (priceStats.length > 0) {
      options.priceRange = {
        min: Math.floor(priceStats[0].min),
        max: Math.ceil(priceStats[0].max)
      };
    }

    // Get rating distribution
    const ratings = await Product.aggregate([
      { $match: { ...searchCriteria, 'ratings.average': { $exists: true } } },
      { $group: { _id: { $floor: '$ratings.average' }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);
    options.ratings = ratings.map(item => ({ rating: item._id, count: item.count }));

    return options;
  } catch (error) {
    logger.error('Failed to get filter options', { error: error.message });
    return { categories: [], brands: [], priceRange: { min: 0, max: 0 }, ratings: [] };
  }
};

// Get popular searches
export const getPopularSearches = asyncHandler(async (req, res) => {
  try {
    const cacheKey = 'popular:searches';
    let popularSearches = await cache.get(cacheKey);

    if (!popularSearches) {
      // In a real application, you'd track search queries in a separate collection
      // For now, we'll return some mock data
      popularSearches = [
        { query: 'smartphone', count: 150 },
        { query: 'laptop', count: 120 },
        { query: 'headphones', count: 95 },
        { query: 'camera', count: 80 },
        { query: 'watch', count: 65 }
      ];

      await cache.set(cacheKey, popularSearches, 3600); // Cache for 1 hour
    }

    res.status(200).json(new ApiResponse(200, popularSearches, 'Popular searches retrieved'));

  } catch (error) {
    logger.error('Failed to get popular searches', { error: error.message });
    throw new ApiError(500, 'Failed to get popular searches');
  }
});

// Auto-complete search
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query || query.length < 2) {
      return res.status(200).json(new ApiResponse(200, [], 'Query too short'));
    }

    const cacheKey = `suggestions:${query}`;
    let suggestions = await cache.get(cacheKey);

    if (!suggestions) {
      // Search in product names
      const products = await Product.find({
        isActive: true,
        name: { $regex: query, $options: 'i' }
      })
      .select('name _id')
      .limit(10)
      .lean();

      suggestions = products.map(product => ({
        text: product.name,
        type: 'product',
        id: product._id
      }));

      // Add category suggestions
      const categories = await Product.distinct('category', {
        isActive: true,
        category: { $regex: query, $options: 'i' }
      });

      categories.slice(0, 5).forEach(category => {
        suggestions.push({
          text: category,
          type: 'category',
          id: category
        });
      });

      // Add brand suggestions
      const brands = await Product.distinct('brand', {
        isActive: true,
        brand: { $regex: query, $options: 'i' }
      });

      brands.slice(0, 5).forEach(brand => {
        suggestions.push({
          text: brand,
          type: 'brand',
          id: brand
        });
      });

      await cache.set(cacheKey, suggestions, 300); // Cache for 5 minutes
    }

    res.status(200).json(new ApiResponse(200, suggestions, 'Search suggestions retrieved'));

  } catch (error) {
    logger.error('Failed to get search suggestions', { error: error.message });
    throw new ApiError(500, 'Failed to get search suggestions');
  }
});
