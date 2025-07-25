import Product from '../models/product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Create new product
const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    originalPrice,
    discountPercentage,
    category,
    subcategory,
    brand,
    images,
    colors,
    sizes,
    stock,
    sku,
    tags,
    weight,
    dimensions,
    shippingInfo,
    warranty,
    returnPolicy
  } = req.body;

  // Check if product with same SKU already exists
  if (sku) {
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      throw new ApiError(400, 'Product with this SKU already exists');
    }
  }

  const product = await Product.create({
    name,
    description,
    price,
    originalPrice,
    discountPercentage,
    category,
    subcategory,
    brand,
    images,
    colors,
    sizes,
    stock,
    sku,
    tags,
    weight,
    dimensions,
    shippingInfo,
    warranty,
    returnPolicy
  });

  return res.status(201).json(
    new ApiResponse(201, product, 'Product created successfully')
  );
});

// Get all products with filtering, sorting, and pagination
const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    category,
    subcategory,
    brand,
    minPrice,
    maxPrice,
    search,
    featured,
    trending,
    bestSeller,
    inStock
  } = req.query;

  // Build filter object
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (subcategory) filter.subcategory = subcategory;
  if (brand) filter.brand = brand;
  if (featured === 'true') filter.featured = true;
  if (trending === 'true') filter.trending = true;
  if (bestSeller === 'true') filter.bestSeller = true;
  if (inStock === 'true') filter.stock = { $gt: 0 };

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Search functionality
  if (search) {
    filter.$text = { $search: search };
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const products = await Product.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit))
    .populate('reviews.user', 'name');

  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / parseInt(limit));

  return res.status(200).json(
    new ApiResponse(200, {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      }
    }, 'Products retrieved successfully')
  );
});

// Get single product by ID
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id)
    .populate('reviews.user', 'name avatar')
    .populate({
      path: 'reviews',
      options: { sort: { createdAt: -1 } }
    });

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Get related products
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true
  })
    .limit(4)
    .select('name price images ratings discountPercentage');

  return res.status(200).json(
    new ApiResponse(200, {
      product,
      relatedProducts
    }, 'Product retrieved successfully')
  );
});

// Update product
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if SKU is being updated and if it already exists
  if (req.body.sku && req.body.sku !== product.sku) {
    const existingProduct = await Product.findOne({ sku: req.body.sku });
    if (existingProduct) {
      throw new ApiError(400, 'Product with this SKU already exists');
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    req.body,
    { new: true, runValidators: true }
  );

  return res.status(200).json(
    new ApiResponse(200, updatedProduct, 'Product updated successfully')
  );
});

// Delete product
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Soft delete - just mark as inactive
  product.isActive = false;
  await product.save();

  return res.status(200).json(
    new ApiResponse(200, {}, 'Product deleted successfully')
  );
});

// Add product review
const addProductReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const userId = req.user._id;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user already reviewed this product
  const alreadyReviewed = product.reviews.find(
    review => review.user.toString() === userId.toString()
  );

  if (alreadyReviewed) {
    throw new ApiError(400, 'Product already reviewed');
  }

  const review = {
    user: userId,
    name: req.user.name,
    rating: Number(rating),
    comment
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;

  // Calculate average rating
  const totalRating = product.reviews.reduce((acc, item) => item.rating + acc, 0);
  product.ratings = totalRating / product.reviews.length;

  await product.save();

  return res.status(200).json(
    new ApiResponse(200, product, 'Review added successfully')
  );
});

// Get featured products
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    featured: true,
    isActive: true
  })
    .limit(8)
    .select('name price images ratings discountPercentage category');

  return res.status(200).json(
    new ApiResponse(200, products, 'Featured products retrieved successfully')
  );
});

// Get trending products
const getTrendingProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    trending: true,
    isActive: true
  })
    .limit(8)
    .select('name price images ratings discountPercentage category');

  return res.status(200).json(
    new ApiResponse(200, products, 'Trending products retrieved successfully')
  );
});

// Get best sellers
const getBestSellers = asyncHandler(async (req, res) => {
  const products = await Product.find({
    bestSeller: true,
    isActive: true
  })
    .limit(8)
    .select('name price images ratings discountPercentage category');

  return res.status(200).json(
    new ApiResponse(200, products, 'Best sellers retrieved successfully')
  );
});

// Get categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category', { isActive: true });
  
  return res.status(200).json(
    new ApiResponse(200, categories, 'Categories retrieved successfully')
  );
});

// Get brands
const getBrands = asyncHandler(async (req, res) => {
  const brands = await Product.distinct('brand', { 
    isActive: true,
    brand: { $exists: true, $ne: '' }
  });
  
  return res.status(200).json(
    new ApiResponse(200, brands, 'Brands retrieved successfully')
  );
});

// Create fashion products for the store
const createFashionProducts = asyncHandler(async (req, res) => {
  const fashionProducts = [
    {
      name: "Elegant Summer Maxi Dress",
      description: "A stunning maxi dress perfect for summer events. Features a flattering silhouette with adjustable straps and a flowing skirt. Made from breathable cotton blend.",
      price: 12999,
      originalPrice: 17999,
      discountPercentage: 28,
      category: "Fashion",
      subcategory: "Dresses",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Navy Blue", "Rose Pink", "Emerald Green"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 45,
      sku: "DR-001",
      tags: ["summer", "maxi", "elegant", "formal"],
      ratings: 4.6,
      numReviews: 89,
      featured: true,
      trending: true,
      bestSeller: false,
      weight: 0.4,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Classic White Blouse",
      description: "A timeless white blouse that goes with everything. Features a flattering cut and premium cotton fabric.",
      price: 4599,
      originalPrice: 6599,
      discountPercentage: 30,
      category: "Fashion",
      subcategory: "Tops",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["White", "Light Blue", "Pink"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 75,
      sku: "TP-001",
      tags: ["classic", "blouse", "versatile", "professional"],
      ratings: 4.5,
      numReviews: 156,
      featured: true,
      trending: false,
      bestSeller: true,
      weight: 0.25,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "High-Waist Skinny Jeans",
      description: "Flattering high-waist skinny jeans with stretch denim. Perfect for any casual or semi-formal occasion.",
      price: 7999,
      originalPrice: 9999,
      discountPercentage: 20,
      category: "Fashion",
      subcategory: "Bottoms",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500&h=600&fit=crop"
      ],
      colors: ["Blue", "Black", "Gray"],
      sizes: ["24", "26", "28", "30", "32"],
      stock: 65,
      sku: "BT-001",
      tags: ["jeans", "skinny", "high-waist", "stretch"],
      ratings: 4.4,
      numReviews: 203,
      featured: false,
      trending: true,
      bestSeller: true,
      weight: 0.5,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Natural Face Cream",
      description: "Hydrating face cream made with natural ingredients. Suitable for all skin types, provides 24-hour moisture and anti-aging benefits.",
      price: 1499,
      originalPrice: 1999,
      discountPercentage: 25,
      category: "Beauty",
      subcategory: "Skincare",
      brand: "NaturalGlow",
      images: [
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&h=600&fit=crop"
      ],
      colors: ["White"],
      sizes: ["50ml", "100ml"],
      stock: 75,
      sku: "FC-001",
      tags: ["natural", "skincare", "moisturizer"],
      ratings: 4.6,
      numReviews: 203,
      bestSeller: true,
      weight: 0.1,
      shippingInfo: {
        freeShipping: false,
        shippingCost: 80
      }
    },
    {
      name: "Yoga Mat Premium",
      description: "Non-slip yoga mat made from eco-friendly materials. Perfect for yoga, pilates, and fitness activities. Includes carrying strap.",
      price: 2499,
      originalPrice: 3499,
      discountPercentage: 29,
      category: "Sports",
      subcategory: "Fitness",
      brand: "YogaLife",
      images: [
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=600&fit=crop"
      ],
      colors: ["Purple", "Blue", "Green", "Pink"],
      sizes: ["Standard", "Extra Long"],
      stock: 40,
      sku: "YM-001",
      tags: ["yoga", "fitness", "eco-friendly"],
      ratings: 4.4,
      numReviews: 67,
      featured: true,
      weight: 1.2,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Smart Home Speaker",
      description: "Voice-controlled smart speaker with premium sound quality. Compatible with all major smart home systems and music streaming services.",
      price: 3999,
      originalPrice: 5999,
      discountPercentage: 33,
      category: "Electronics",
      subcategory: "Smart Home",
      brand: "SmartHome",
      images: [
        "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1543512214-318c7553f230?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "White"],
      sizes: ["One Size"],
      stock: 25,
      sku: "SHS-001",
      tags: ["smart", "speaker", "voice-control"],
      ratings: 4.1,
      numReviews: 94,
      trending: true,
      weight: 0.8,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Designer Handbag",
      description: "Elegant leather handbag with multiple compartments. Perfect for work and casual occasions. Includes adjustable strap and security pocket.",
      price: 8999,
      originalPrice: 12999,
      discountPercentage: 31,
      category: "Fashion",
      subcategory: "Accessories",
      brand: "Elegance",
      images: [
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=600&fit=crop"
      ],
      colors: ["Brown", "Black", "Tan"],
      sizes: ["One Size"],
      stock: 20,
      sku: "HB-001",
      tags: ["leather", "handbag", "designer"],
      ratings: 4.7,
      numReviews: 45,
      bestSeller: true,
      weight: 0.5,
      shippingInfo: {
        freeShipping: false,
        shippingCost: 150
      }
    },
    {
      name: "Wireless Charging Pad",
      description: "Fast wireless charging pad compatible with all Qi-enabled devices. Features LED indicator and non-slip surface for secure charging.",
      price: 1999,
      originalPrice: 2999,
      discountPercentage: 33,
      category: "Electronics",
      subcategory: "Accessories",
      brand: "ChargeTech",
      images: [
        "https://images.unsplash.com/photo-1609592806598-059d8d1d7a2e?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1609592806598-059d8d1d7a2e?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1609592806598-059d8d1d7a2e?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "White"],
      sizes: ["One Size"],
      stock: 60,
      sku: "WCP-001",
      tags: ["wireless", "charging", "fast-charge"],
      ratings: 4.3,
      numReviews: 112,
      featured: true,
      weight: 0.3,
      shippingInfo: {
        freeShipping: false,
        shippingCost: 100
      }
    },
    {
      name: "Silk Evening Dress",
      description: "A luxurious silk evening dress perfect for formal events. Features elegant draping and sophisticated design.",
      price: 15999,
      originalPrice: 19999,
      discountPercentage: 20,
      category: "Fashion",
      subcategory: "Dresses",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "Navy", "Burgundy"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 28,
      sku: "DR-004",
      tags: ["evening", "silk", "formal", "luxury"],
      ratings: 4.8,
      numReviews: 67,
      featured: true,
      trending: false,
      bestSeller: false,
      weight: 0.5,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Casual Denim Jacket",
      description: "A versatile denim jacket perfect for layering. Features a classic fit and comfortable stretch denim.",
      price: 6999,
      originalPrice: 8999,
      discountPercentage: 22,
      category: "Fashion",
      subcategory: "Outerwear",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Blue", "Black", "Gray"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 42,
      sku: "OW-004",
      tags: ["denim", "jacket", "casual", "versatile"],
      ratings: 4.3,
      numReviews: 89,
      featured: false,
      trending: true,
      bestSeller: false,
      weight: 0.6,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Premium Leather Boots",
      description: "High-quality leather boots perfect for autumn and winter. Features durable construction and comfortable fit.",
      price: 12999,
      originalPrice: 15999,
      discountPercentage: 19,
      category: "Fashion",
      subcategory: "Shoes",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=600&fit=crop"
      ],
      colors: ["Brown", "Black", "Tan"],
      sizes: ["6", "7", "8", "9", "10"],
      stock: 35,
      sku: "SH-004",
      tags: ["boots", "leather", "autumn", "winter"],
      ratings: 4.6,
      numReviews: 124,
      featured: false,
      trending: false,
      bestSeller: true,
      weight: 0.8,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Elegant Pearl Necklace",
      description: "A timeless pearl necklace perfect for any occasion. Features high-quality freshwater pearls.",
      price: 3999,
      originalPrice: 5999,
      discountPercentage: 33,
      category: "Fashion",
      subcategory: "Accessories",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["White", "Pink", "Black"],
      sizes: ["One Size"],
      stock: 58,
      sku: "AC-004",
      tags: ["pearl", "necklace", "elegant", "timeless"],
      ratings: 4.5,
      numReviews: 156,
      featured: true,
      trending: false,
      bestSeller: false,
      weight: 0.1,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Summer Floral Dress",
      description: "A beautiful floral dress perfect for summer days. Features a flattering silhouette and breathable fabric.",
      price: 8999,
      originalPrice: 11999,
      discountPercentage: 25,
      category: "Fashion",
      subcategory: "Dresses",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Blue Floral", "Pink Floral", "Yellow Floral"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 38,
      sku: "DR-005",
      tags: ["summer", "floral", "casual", "comfortable"],
      ratings: 4.4,
      numReviews: 92,
      featured: false,
      trending: true,
      bestSeller: false,
      weight: 0.3,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Cashmere Sweater",
      description: "Ultra-soft cashmere sweater perfect for cold weather. Features a relaxed fit and premium fabric.",
      price: 9999,
      originalPrice: 12999,
      discountPercentage: 23,
      category: "Fashion",
      subcategory: "Tops",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Cream", "Gray", "Navy", "Burgundy"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 45,
      sku: "TP-004",
      tags: ["cashmere", "sweater", "warm", "premium"],
      ratings: 4.7,
      numReviews: 178,
      featured: true,
      trending: false,
      bestSeller: true,
      weight: 0.4,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Wide-Leg Palazzo Pants",
      description: "Elegant wide-leg palazzo pants perfect for both casual and professional settings.",
      price: 7499,
      originalPrice: 9499,
      discountPercentage: 21,
      category: "Fashion",
      subcategory: "Bottoms",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "Navy", "Beige", "Olive"],
      sizes: ["XS", "S", "M", "L", "XL"],
      stock: 32,
      sku: "BT-004",
      tags: ["palazzo", "wide-leg", "elegant", "professional"],
      ratings: 4.5,
      numReviews: 95,
      featured: false,
      trending: false,
      bestSeller: false,
      weight: 0.4,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Designer Sunglasses",
      description: "Luxury designer sunglasses with UV protection. Stylish frames that complement any outfit.",
      price: 5999,
      originalPrice: 7999,
      discountPercentage: 25,
      category: "Fashion",
      subcategory: "Accessories",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1572635196237-14b3f2812f0d?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1572635196237-14b3f2812f0d?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1572635196237-14b3f2812f0d?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "Tortoise", "Clear"],
      sizes: ["One Size"],
      stock: 48,
      sku: "AC-005",
      tags: ["sunglasses", "designer", "luxury", "uv-protection"],
      ratings: 4.8,
      numReviews: 67,
      featured: false,
      trending: true,
      bestSeller: false,
      weight: 0.2,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    },
    {
      name: "Evening Cocktail Dress",
      description: "A sophisticated cocktail dress perfect for evening events. Features a fitted bodice and knee-length skirt.",
      price: 10999,
      originalPrice: 13999,
      discountPercentage: 21,
      category: "Fashion",
      subcategory: "Dresses",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Black", "Burgundy", "Navy"],
      sizes: ["XS", "S", "M", "L"],
      stock: 25,
      sku: "DR-006",
      tags: ["cocktail", "evening", "formal", "party"],
      ratings: 4.4,
      numReviews: 78,
      featured: false,
      trending: true,
      bestSeller: false,
      weight: 0.3,
      shippingInfo: {
        freeShipping: false,
        shippingCost: 8
      }
    },
    {
      name: "Silk Scarf Collection",
      description: "A luxurious silk scarf collection perfect for adding elegance to any outfit. Features beautiful patterns.",
      price: 3499,
      originalPrice: 4999,
      discountPercentage: 30,
      category: "Fashion",
      subcategory: "Accessories",
      brand: "Élégance",
      images: [
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&h=600&fit=crop",
        "https://images.unsplash.com/photo-1434389677669-e08b4c3b5bcc?w=500&h=600&fit=crop"
      ],
      colors: ["Red", "Blue", "Green", "Purple"],
      sizes: ["One Size"],
      stock: 72,
      sku: "AC-006",
      tags: ["scarf", "silk", "luxury", "elegant"],
      ratings: 4.3,
      numReviews: 89,
      featured: false,
      trending: true,
      bestSeller: false,
      weight: 0.1,
      shippingInfo: {
        freeShipping: true,
        shippingCost: 0
      }
    }
  ];

  // Clear existing products
  await Product.deleteMany({});

  const createdProducts = await Product.insertMany(fashionProducts);

  return res.status(201).json(
    new ApiResponse(201, createdProducts, 'Fashion products created successfully')
  );
});

// Get related products
const getRelatedProducts = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Find related products from the same category, excluding the current product
  const relatedProducts = await Product.find({
    category: product.category,
    _id: { $ne: product._id },
    isActive: true
  })
    .limit(4)
    .select('name price images ratings discountPercentage category brand');

  return res.status(200).json(
    new ApiResponse(200, relatedProducts, 'Related products retrieved successfully')
  );
});

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addProductReview,
  getFeaturedProducts,
  getTrendingProducts,
  getBestSellers,
  getCategories,
  getBrands,
  getRelatedProducts,
  createFashionProducts
}; 