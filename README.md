# E-commerce Backend API

A robust, secure, and scalable e-commerce backend API built with Node.js, Express.js, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Complete user registration, login, profile management
- **Product Management**: CRUD operations for products with advanced filtering
- **Order Management**: Complete order lifecycle management
- **Payment Integration**: Stripe payment processing
- **File Upload**: Image upload with Cloudinary integration
- **Email Notifications**: Email verification and password reset
- **Security**: Rate limiting, input validation, XSS protection, CORS
- **Admin Dashboard**: Comprehensive admin panel with analytics

## 🛠 Tech Stack

- **Runtime**: Node.js (ES6+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer, Sharp
- **Email**: Nodemailer
- **Payment**: Stripe
- **Cloud Storage**: Cloudinary

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Database configuration
├── controllers/
│   ├── auth.controller.js    # Authentication logic
│   └── product.controller.js # Product management
├── middleware/
│   ├── auth.middleware.js    # JWT authentication
│   ├── error.middleware.js   # Error handling
│   ├── validate.middleware.js # Input validation
│   └── notFound.middleware.js # 404 handling
├── models/
│   ├── User.model.js         # User schema
│   ├── Product.model.js      # Product schema
│   ├── Order.model.js        # Order schema
│   └── Category.model.js     # Category schema
├── routes/
│   ├── auth.routes.js        # Authentication routes
│   ├── product.routes.js     # Product routes
│   ├── order.routes.js       # Order routes
│   ├── user.routes.js        # User routes
│   ├── category.routes.js    # Category routes
│   ├── review.routes.js      # Review routes
│   ├── payment.routes.js     # Payment routes
│   └── admin.routes.js       # Admin routes
├── utils/
│   ├── ApiError.js           # Custom error class
│   ├── ApiFeatures.js        # Advanced filtering
│   ├── asyncHandler.js       # Async error handling
│   ├── sendToken.js          # JWT token utility
│   └── sendEmail.js          # Email utility
├── uploads/                  # File upload directory
├── server.js                 # Main server file
├── package.json              # Dependencies
└── env.example              # Environment variables template
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ecommerce
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=30d
   JWT_COOKIE_EXPIRE=30
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   STRIPE_SECRET_KEY=your-stripe-secret-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update user profile
- `PUT /api/auth/update-password` - Update password
- `POST /api/auth/forgot-password` - Forgot password
- `PUT /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Product Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `GET /api/products/featured` - Get featured products
- `GET /api/products/trending` - Get trending products
- `GET /api/products/best-sellers` - Get best sellers
- `GET /api/products/category/:categoryId` - Get products by category
- `GET /api/products/search` - Search products

### Order Endpoints

- `POST /api/orders` - Create new order
- `GET /api/orders/my-orders` - Get user orders
- `GET /api/orders/:id` - Get single order
- `PUT /api/orders/:id/cancel` - Cancel order
- `GET /api/orders` - Get all orders (Admin)
- `PUT /api/orders/:id/status` - Update order status (Admin)

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/addresses` - Get user addresses
- `POST /api/users/addresses` - Add user address
- `PUT /api/users/addresses/:id` - Update user address
- `DELETE /api/users/addresses/:id` - Delete user address
- `GET /api/users/wishlist` - Get user wishlist
- `POST /api/users/wishlist/:productId` - Add to wishlist
- `DELETE /api/users/wishlist/:productId` - Remove from wishlist

### Admin Endpoints

- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/inventory` - Get inventory
- `PUT /api/admin/inventory/:id` - Update inventory
- `GET /api/admin/analytics` - Get analytics
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-based Access Control**: Admin, moderator, and user roles
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against brute force attacks
- **XSS Protection**: Cross-site scripting protection
- **CORS**: Cross-origin resource sharing configuration
- **Helmet**: Security headers
- **MongoDB Sanitization**: NoSQL injection protection
- **Password Hashing**: Bcrypt password encryption

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📦 Deployment

### Environment Variables

Make sure to set all required environment variables in production:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
# ... other variables
```

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start server.js --name "ecommerce-api"

# Monitor
pm2 monit

# Logs
pm2 logs
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@ecommerce.com or create an issue in the repository. 