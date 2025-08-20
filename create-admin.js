import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.model.js';
import connectDB from './config/database.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Delete existing admin@arizaan.com user
    await User.deleteOne({ email: 'admin@arizaan.com' });
    console.log('🗑️ Deleted existing admin@arizaan.com user');
    
    // Create new admin user
    const adminUser = await User.create({
      name: 'Arizaan Admin',
      email: 'admin@arizaan.com',
      password: 'arizaan123',
      role: 'admin',
      permissions: [
        'manage_users',
        'manage_products',
        'manage_orders',
        'view_analytics',
        'manage_settings'
      ]
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@arizaan.com');
    console.log('Password: arizaan123');
    console.log('Role: admin');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdminUser(); 