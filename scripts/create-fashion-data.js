import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Product from '../models/product.model.js';
import Category from '../models/Category.model.js';
import User from '../models/User.model.js';

dotenv.config();

const fashionProducts = [
  {
    name: "Elegant Silk Hijab - Rose Gold",
    description: "Premium silk hijab with elegant rose gold embroidery. Perfect for special occasions and daily wear. Features breathable fabric and comfortable fit.",
    price: 1299,
    originalPrice: 1599,
    category: "Fashion",
    subcategory: "Hijab",
    brand: "Arizaan",
    sku: "ARZ-HIJ-001",
    images: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop"
    ],
    colors: ["Rose Gold", "Navy Blue", "Emerald Green"],
    sizes: ["One Size"],
    stock: 45,
    featured: true,
    trending: true,
    bestSeller: true,
    ratings: 4.8,
    numReviews: 127,
    tags: ["Premium", "Silk", "Embroidered", "Special Occasion"]
  },
  {
    name: "Modest Kurti Set - Floral Print",
    description: "Comfortable and stylish kurti set with beautiful floral print. Perfect for casual and semi-formal occasions. Includes matching dupatta.",
    price: 899,
    originalPrice: 1199,
    category: "Fashion",
    subcategory: "Kurti",
    brand: "Arizaan",
    sku: "ARZ-KUR-001",
    images: [
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop"
    ],
    colors: ["Pink Floral", "Blue Floral", "Green Floral"],
    sizes: ["S", "M", "L", "XL"],
    stock: 32,
    featured: true,
    trending: true,
    bestSeller: false,
    ratings: 4.6,
    numReviews: 89,
    tags: ["Floral", "Comfortable", "Casual", "Set"]
  },
  {
    name: "Embroidered Handbag - Traditional",
    description: "Handcrafted embroidered handbag with traditional Bangladeshi motifs. Perfect for carrying essentials while maintaining elegance.",
    price: 599,
    originalPrice: 799,
    category: "Fashion",
    subcategory: "Bags",
    brand: "Arizaan",
    sku: "ARZ-BAG-001",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop"
    ],
    colors: ["Red", "Navy", "Gold"],
    sizes: ["One Size"],
    stock: 28,
    featured: true,
    trending: false,
    bestSeller: true,
    ratings: 4.7,
    numReviews: 156,
    tags: ["Handcrafted", "Embroidered", "Traditional", "Elegant"]
  },
  {
    name: "Pearl Necklace Set - Classic",
    description: "Elegant pearl necklace set with matching earrings. Perfect for formal occasions and daily wear. Features high-quality freshwater pearls.",
    price: 449,
    originalPrice: 599,
    category: "Fashion",
    subcategory: "Jewelry",
    brand: "Arizaan",
    sku: "ARZ-JEW-001",
    images: [
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop"
    ],
    colors: ["White Pearl", "Pink Pearl", "Gold Pearl"],
    sizes: ["One Size"],
    stock: 67,
    featured: false,
    trending: true,
    bestSeller: true,
    ratings: 4.9,
    numReviews: 203,
    tags: ["Pearl", "Classic", "Formal", "Set"]
  },
  {
    name: "Eid Gift Pack - Premium Collection",
    description: "Complete Eid collection including hijab, kurti, and accessories. Perfect gift for loved ones. Beautifully packaged with premium materials.",
    price: 2499,
    originalPrice: 3299,
    category: "Fashion",
    subcategory: "Gift Packs",
    brand: "Arizaan",
    sku: "ARZ-GFT-001",
    images: [
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop"
    ],
    colors: ["Eid Collection", "Festival Pack", "Special Edition"],
    sizes: ["Gift Pack"],
    stock: 15,
    featured: true,
    trending: true,
    bestSeller: false,
    ratings: 4.8,
    numReviews: 45,
    tags: ["Gift", "Premium", "Collection", "Eid"]
  },
  {
    name: "Cotton Hijab - Daily Comfort",
    description: "Soft cotton hijab perfect for daily wear. Breathable and comfortable fabric with elegant design. Available in multiple colors.",
    price: 399,
    originalPrice: 499,
    category: "Fashion",
    subcategory: "Hijab",
    brand: "Arizaan",
    sku: "ARZ-HIJ-002",
    images: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop"
    ],
    colors: ["Black", "Navy", "Gray", "Brown"],
    sizes: ["One Size"],
    stock: 89,
    featured: false,
    trending: false,
    bestSeller: true,
    ratings: 4.5,
    numReviews: 234,
    tags: ["Cotton", "Daily", "Comfortable", "Basic"]
  },
  {
    name: "Designer Kurti - Party Wear",
    description: "Stunning designer kurti perfect for parties and special occasions. Features intricate embroidery and premium fabric.",
    price: 1599,
    originalPrice: 1999,
    category: "Fashion",
    subcategory: "Kurti",
    brand: "Arizaan",
    sku: "ARZ-KUR-002",
    images: [
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop"
    ],
    colors: ["Gold", "Silver", "Rose Gold"],
    sizes: ["S", "M", "L", "XL"],
    stock: 23,
    featured: true,
    trending: true,
    bestSeller: false,
    ratings: 4.7,
    numReviews: 78,
    tags: ["Designer", "Party", "Embroidered", "Premium"]
  },
  {
    name: "Leather Wallet - Minimalist",
    description: "Elegant leather wallet with minimalist design. Perfect for carrying cards and cash while maintaining style.",
    price: 299,
    originalPrice: 399,
    category: "Fashion",
    subcategory: "Bags",
    brand: "Arizaan",
    sku: "ARZ-BAG-002",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop"
    ],
    colors: ["Brown", "Black", "Tan"],
    sizes: ["One Size"],
    stock: 45,
    featured: false,
    trending: false,
    bestSeller: true,
    ratings: 4.4,
    numReviews: 167,
    tags: ["Leather", "Minimalist", "Practical", "Elegant"]
  }
];

const categories = [
  {
    name: "Hijab",
    description: "Elegant and comfortable hijabs for every occasion",
    image: {
      public_id: "",
      url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500&h=500&fit=crop"
    },
    featured: true
  },
  {
    name: "Kurti",
    description: "Stylish kurtis perfect for casual and formal wear",
    image: {
      public_id: "",
      url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop"
    },
    featured: true
  },
  {
    name: "Bags",
    description: "Handcrafted bags and accessories",
    image: {
      public_id: "",
      url: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&h=500&fit=crop"
    },
    featured: true
  },
  {
    name: "Jewelry",
    description: "Elegant jewelry pieces for every occasion",
    image: {
      public_id: "",
      url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=500&fit=crop"
    },
    featured: true
  },
  {
    name: "Gift Packs",
    description: "Perfect gift collections for special occasions",
    image: {
      public_id: "",
      url: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=500&h=500&fit=crop"
    },
    featured: true
  }
];

async function createFashionData() {
  try {
    await connectDB();
    
    console.log('Connected to MongoDB');
    
    // Create admin user if doesn't exist
    let adminUser = await User.findOne({ email: 'admin@arizaan.com' });
    
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Arizaan Admin',
        email: 'admin@arizaan.com',
        password: 'admin123456',
        role: 'admin',
        avatar: {
          public_id: '',
          url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'
        }
      });
      console.log('Created admin user');
    } else {
      console.log('Admin user already exists');
    }
    
    // Create review users
    const reviewUsers = [
      { name: 'Fatima A.', email: 'fatima@example.com' },
      { name: 'Aisha K.', email: 'aisha@example.com' },
      { name: 'Zara H.', email: 'zara@example.com' },
      { name: 'Nadia S.', email: 'nadia@example.com' },
      { name: 'Mariam K.', email: 'mariam@example.com' },
      { name: 'Amina R.', email: 'amina@example.com' },
      { name: 'Sara M.', email: 'sara@example.com' },
      { name: 'Fatima Z.', email: 'fatimaz@example.com' },
      { name: 'Layla A.', email: 'layla@example.com' }
    ];
    
    const createdUsers = [];
    for (const userData of reviewUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = await User.create({
          name: userData.name,
          email: userData.email,
          password: 'password123',
          role: 'user',
          avatar: {
            public_id: '',
            url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop'
          }
        });
      }
      createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} review users`);
    
    // Clear existing data
    await Product.deleteMany({});
    await Category.deleteMany({});
    
    console.log('Cleared existing data');
    
    // Create categories with admin user
    const categoriesWithAdmin = categories.map(category => ({
      ...category,
      createdBy: adminUser._id
    }));
    
    const createdCategories = await Category.insertMany(categoriesWithAdmin);
    console.log(`Created ${createdCategories.length} categories`);
    
    // Create products with reviews
    const productsWithReviews = fashionProducts.map((product, index) => {
      const reviews = [];
      
      // Add 1-2 reviews per product
      const numReviews = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < numReviews; i++) {
        const userIndex = (index + i) % createdUsers.length;
        reviews.push({
          user: createdUsers[userIndex]._id,
          name: createdUsers[userIndex].name,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          comment: `Great product! ${product.name} is exactly what I was looking for.`
        });
      }
      
      return {
        ...product,
        createdBy: adminUser._id,
        reviews,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
    
    const createdProducts = await Product.insertMany(productsWithReviews);
    console.log(`Created ${createdProducts.length} products`);
    
    console.log('✅ Fashion data created successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Categories: ${createdCategories.length}`);
    console.log(`- Products: ${createdProducts.length}`);
    console.log(`- Featured Products: ${createdProducts.filter(p => p.featured).length}`);
    console.log(`- Trending Products: ${createdProducts.filter(p => p.trending).length}`);
    console.log(`- Best Sellers: ${createdProducts.filter(p => p.bestSeller).length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating fashion data:', error);
    process.exit(1);
  }
}

createFashionData(); 