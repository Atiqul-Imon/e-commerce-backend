import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import Product from '../../models/product.model.js';
import User from '../../models/User.model.js';

describe('Product Controller', () => {
  let authToken;
  let testUser;

  beforeEach(async () => {
    // Clear collections
    await Product.deleteMany({});
    await User.deleteMany({});

    // Create test user and get auth token
    const userData = {
      identifier: 'test@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.token;
    testUser = registerResponse.body.user;
  });

  describe('POST /api/products', () => {
    it('should create a new product with valid data', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 1000,
        originalPrice: 1200,
        discountPercentage: 17,
        category: 'Electronics',
        subcategory: 'Phones',
        brand: 'TestBrand',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        colors: ['Red', 'Blue'],
        sizes: ['S', 'M', 'L'],
        stock: 50,
        tags: ['test', 'electronics'],
        weight: 0.5
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(productData.name);
      expect(response.body.data.price).toBe(productData.price);
    });

    it('should not create product without required fields', async () => {
      const productData = {
        name: 'Test Product'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should not create product with invalid price', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: -100, // Invalid negative price
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['https://example.com/image1.jpg'],
        stock: 50
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive number');
    });

    it('should not create product with invalid images', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 1000,
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['invalid-url'], // Invalid image URL
        stock: 50
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('valid URL');
    });
  });

  describe('GET /api/products', () => {
    beforeEach(async () => {
      // Create test products
      const products = [
        {
          name: 'Product 1',
          description: 'Description for product 1 that is long enough',
          price: 1000,
          category: 'Electronics',
          brand: 'Brand1',
          images: ['https://example.com/image1.jpg'],
          stock: 10,
          featured: true
        },
        {
          name: 'Product 2',
          description: 'Description for product 2 that is long enough',
          price: 2000,
          category: 'Fashion',
          brand: 'Brand2',
          images: ['https://example.com/image2.jpg'],
          stock: 20,
          trending: true
        }
      ];

      for (const product of products) {
        await Product.create(product);
      }
    });

    it('should get all products', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter products by category', async () => {
      const response = await request(app)
        .get('/api/products?category=Electronics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].category).toBe('Electronics');
    });

    it('should filter featured products', async () => {
      const response = await request(app)
        .get('/api/products?featured=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].featured).toBe(true);
    });

    it('should search products by name', async () => {
      const response = await request(app)
        .get('/api/products?search=Product 1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.products[0].name).toBe('Product 1');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/products?page=1&limit=1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.products).toHaveLength(1);
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('GET /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 1000,
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['https://example.com/image1.jpg'],
        stock: 50
      });
    });

    it('should get product by ID', async () => {
      const response = await request(app)
        .get(`/api/products/${testProduct._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.name).toBe(testProduct.name);
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/products/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 400 for invalid product ID', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid ID format');
    });
  });

  describe('PUT /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 1000,
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['https://example.com/image1.jpg'],
        stock: 50
      });
    });

    it('should update product with valid data', async () => {
      const updateData = {
        name: 'Updated Product',
        price: 1500,
        stock: 75
      };

      const response = await request(app)
        .put(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.price).toBe(updateData.price);
    });

    it('should not update product with invalid data', async () => {
      const updateData = {
        price: -100 // Invalid negative price
      };

      const response = await request(app)
        .put(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('positive number');
    });
  });

  describe('DELETE /api/products/:id', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Test Product',
        description: 'This is a test product description that is long enough',
        price: 1000,
        category: 'Electronics',
        brand: 'TestBrand',
        images: ['https://example.com/image1.jpg'],
        stock: 50
      });
    });

    it('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProduct._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify product is deleted
      const getResponse = await request(app)
        .get(`/api/products/${testProduct._id}`)
        .expect(404);
    });
  });
});

