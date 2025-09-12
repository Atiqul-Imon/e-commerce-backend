import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log('MongoDB connected for indexing...');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create indexes for better performance
const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    console.log('Creating database indexes...');

    // User collection indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ isActive: 1 });

    // Product collection indexes
    await db.collection('products').createIndex({ name: 'text', description: 'text', tags: 'text' });
    await db.collection('products').createIndex({ category: 1 });
    await db.collection('products').createIndex({ subcategory: 1 });
    await db.collection('products').createIndex({ brand: 1 });
    await db.collection('products').createIndex({ price: 1 });
    await db.collection('products').createIndex({ featured: 1 });
    await db.collection('products').createIndex({ trending: 1 });
    await db.collection('products').createIndex({ bestSeller: 1 });
    await db.collection('products').createIndex({ isActive: 1 });
    await db.collection('products').createIndex({ createdAt: -1 });
    await db.collection('products').createIndex({ 'ratings.average': -1 });
    await db.collection('products').createIndex({ stock: 1 });
    await db.collection('products').createIndex({ sku: 1 }, { unique: true, sparse: true });

    // Order collection indexes
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection('orders').createIndex({ user: 1 });
    await db.collection('orders').createIndex({ orderStatus: 1 });
    await db.collection('orders').createIndex({ paymentStatus: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ 'shippingAddress.phone': 1 });
    await db.collection('orders').createIndex({ 'customerInfo.email': 1 });
    await db.collection('orders').createIndex({ 'customerInfo.phone': 1 });

    // Cart collection indexes
    await db.collection('carts').createIndex({ user: 1 }, { unique: true });
    await db.collection('carts').createIndex({ updatedAt: -1 });

    // Category collection indexes
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('categories').createIndex({ isActive: 1 });

    // Review collection indexes
    await db.collection('reviews').createIndex({ product: 1 });
    await db.collection('reviews').createIndex({ user: 1 });
    await db.collection('reviews').createIndex({ rating: 1 });
    await db.collection('reviews').createIndex({ createdAt: -1 });
    await db.collection('reviews').createIndex({ product: 1, user: 1 }, { unique: true });

    // Lead collection indexes
    await db.collection('leads').createIndex({ email: 1 });
    await db.collection('leads').createIndex({ phone: 1 });
    await db.collection('leads').createIndex({ createdAt: -1 });
    await db.collection('leads').createIndex({ status: 1 });

    console.log('✅ All indexes created successfully!');
    
    // Show index statistics
    const collections = ['users', 'products', 'orders', 'carts', 'categories', 'reviews', 'leads'];
    for (const collectionName of collections) {
      const indexes = await db.collection(collectionName).indexes();
      console.log(`\n📊 ${collectionName} indexes:`, indexes.length);
    }

  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createIndexes();
  await mongoose.disconnect();
  console.log('\n🎉 Indexing completed successfully!');
  process.exit(0);
};

main().catch(console.error);
