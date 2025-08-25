# E-Commerce Platform

A modern, full-stack e-commerce application built with Django REST Framework backend and Next.js frontend, featuring comprehensive payment processing, user management, and administrative capabilities. The application is fully containerized with Docker for easy deployment and development.

## 🚀 Key Features

### 💳 Advanced Payment System
- **Stripe Integration**: Secure payment processing with Stripe Checkout
- **Multiple Payment Methods**: Support for credit/debit cards and digital wallets
- **Smart Session Management**: Time-limited payment sessions with automatic cleanup
- **Duplicate Prevention**: Intelligent detection and prevention of duplicate orders
- **Payment Verification**: Comprehensive webhook-based payment verification
- **Real-time Updates**: Live payment status updates via Stripe webhooks
- **Refund Management**: Full refund processing with automatic inventory restoration
- **Payment Analytics**: Detailed transaction tracking and payment statistics
- **Session Recovery**: Continue payment for pending orders seamlessly
- **Fraud Protection**: Built-in chargeback and dispute handling mechanisms

### 🛍️ Product & Catalog Management
- **Product Variants**: Support for multiple product variants (colors, storage, etc.)
- **Category Hierarchy**: Organized product categories with subcategory support
- **Image Management**: Multiple product images with upload functionality
- **Stock Management**: Real-time inventory tracking with low stock alerts
- **Product Reviews**: Customer reviews and ratings system
- **Search & Filtering**: Advanced product search with multiple filters
- **Personalized Recommendations**: AI-driven product recommendations
- **Wishlist System**: Save products for later purchase

### 🛒 Shopping Experience
- **Persistent Cart**: Shopping cart that persists across sessions
- **Guest Checkout**: Purchase without account creation
- **Cart Management**: Add, update, remove items with real-time validation
- **Shipping Options**: Multiple shipping methods with cost calculation
- **Address Management**: Save and manage multiple shipping addresses
- **Order Tracking**: Complete order history with status updates
- **Mobile Responsive**: Optimized for all device sizes

### 👤 User Management & Authentication
- **JWT Authentication**: Secure token-based authentication system
- **User Profiles**: Comprehensive user account management
- **Address Book**: Multiple address management with default settings
- **Order History**: Complete purchase history with detailed views
- **Account Security**: Password change and security settings
- **Email Verification**: Account verification via email
- **Social Login**: Ready for social authentication integration

### 🎨 Frontend (Next.js 15)
- **Modern UI/UX**: Built with Radix UI components and Tailwind CSS
- **App Router**: Next.js 15 App Router for optimal performance
- **TypeScript**: Full TypeScript support for type safety
- **Responsive Design**: Mobile-first responsive design approach
- **Theme Support**: Light/Dark theme switching capabilities
- **Real-time Updates**: Live cart and order status updates
- **Progressive Web App**: PWA-ready with offline capabilities
- **SEO Optimized**: Server-side rendering for better SEO

### 🔧 Backend (Django 5.1.2)
- **REST API**: Comprehensive RESTful API with Django REST Framework
- **Database**: MySQL 8.0 with optimized queries and indexing
- **Admin Interface**: Enhanced Django admin for content management
- **Background Tasks**: Async task processing for heavy operations
- **File Management**: Secure file upload and storage system
- **API Documentation**: Auto-generated API documentation
- **Pagination**: Efficient pagination for large datasets
- **CORS Support**: Cross-origin resource sharing configuration

### 🛡️ Security & Performance
- **Secure Payments**: PCI-compliant payment processing
- **Data Protection**: GDPR-compliant data handling
- **Rate Limiting**: API rate limiting for abuse prevention
- **Input Validation**: Comprehensive input validation and sanitization
- **SSL Ready**: HTTPS/SSL certificate support
- **Performance Monitoring**: Built-in performance tracking
- **Caching**: Strategic caching for improved performance

## 🛠 Technology Stack

### Backend Technologies
- **Framework**: Django 5.1.2 with Django REST Framework 3.14.0
- **Database**: MySQL 8.0 with mysqlclient 2.2.5
- **Authentication**: JWT (djangorestframework-simplejwt 5.3.0)
- **Payment Processing**: Stripe SDK with webhook support
- **Image Processing**: Pillow 10.2.0 for image handling
- **CORS**: django-cors-headers 4.3.1 for cross-origin requests
- **Environment Management**: python-dotenv 1.0.0
- **Filtering**: django-filter 25.1 for advanced API filtering

### Frontend Technologies
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript 5.x for type safety
- **Styling**: Tailwind CSS 3.4.17 with custom configuration
- **UI Components**: Radix UI component library
- **Forms**: React Hook Form 7.54.1 with Zod validation
- **HTTP Client**: Axios 1.10.0 for API communication
- **State Management**: React Context API with custom hooks
- **Icons**: Lucide React 0.454.0 icon library
- **Carousel**: Embla Carousel React 8.5.1
- **Charts**: Recharts 2.15.0 for analytics visualization
- **Notifications**: Sonner 1.7.1 for toast notifications
- **Theme**: next-themes 0.4.4 for dark/light mode

### Development & Deployment
- **Containerization**: Docker with Docker Compose for multi-service orchestration
- **Process Management**: Custom entrypoint scripts for service initialization
- **Hot Reloading**: Development mode with live reload for both frontend and backend
- **Environment Configuration**: Centralized environment variable management
- **Database Migrations**: Django migration system with automatic setup
- **Static Files**: Optimized static file serving and management

## 📋 Prerequisites

- Docker and Docker Compose
- Git
- Stripe Account (for payment processing)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd E-Commerce
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=ecommerce_db
MYSQL_USER=ecommerce_user
MYSQL_PASSWORD=ecommerce_password

# Django Configuration
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Stripe Payment Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_HOST=localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 3. Start the Application
```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 4. Initial Setup
The application will automatically:
- Set up the MySQL database
- Run Django migrations
- Create a superuser account (admin/admin123)

## 📱 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api
- **Django Admin**: http://localhost:8000/admin
- **Database**: localhost:3306

### Default Admin Credentials
- Username: `admin`
- Password: `admin123`

## 🏗 Project Architecture

```
E-Commerce/
├── backend/                           # Django REST API Backend
│   ├── backend/                       # Django project configuration
│   │   ├── settings.py               # Django settings with environment config
│   │   ├── urls.py                   # Main URL configuration
│   │   ├── wsgi.py & asgi.py         # WSGI/ASGI application configs
│   │   └── routers.py                # API routing configuration
│   ├── adminpanel/                   # Admin management application
│   │   ├── models.py                 # Store settings and configuration models
│   │   ├── views.py                  # Admin dashboard views and APIs
│   │   └── serializers.py            # Admin data serializers
│   ├── users/                        # User management system
│   │   ├── models.py                 # User profile and address models
│   │   ├── views.py                  # Authentication and profile APIs
│   │   ├── serializers.py            # User data serializers
│   │   └── signals.py                # User-related signal handlers
│   ├── products/                     # Product catalog system
│   │   ├── models.py                 # Product, variant, and category models
│   │   ├── views.py                  # Product CRUD and search APIs
│   │   ├── serializers.py            # Product data serializers
│   │   ├── permissions.py            # Product-specific permissions
│   │   ├── mixins.py                 # Reusable view mixins
│   │   └── management/               # Custom Django management commands
│   ├── cart/                         # Shopping cart functionality
│   │   ├── models.py                 # Cart and CartItem models
│   │   ├── views.py                  # Cart management APIs
│   │   ├── serializers.py            # Cart data serializers
│   │   └── signals.py                # Cart-related signal handlers
│   ├── orders/                       # Order management system
│   │   ├── models.py                 # Order and OrderItem models
│   │   ├── views.py                  # Order processing APIs
│   │   ├── serializers.py            # Order data serializers
│   │   ├── utils.py                  # Order utility functions (OrderManager)
│   │   └── signals.py                # Order-related signal handlers
│   ├── payments/                     # Payment processing system
│   │   ├── models.py                 # Payment transaction models
│   │   ├── views.py                  # Stripe integration and webhook handlers
│   │   └── admin.py                  # Payment admin interface
│   ├── reviews/                      # Product review system
│   │   ├── models.py                 # Review and rating models
│   │   ├── views.py                  # Review management APIs
│   │   ├── serializers.py            # Review data serializers
│   │   └── signals.py                # Review-related signal handlers
│   ├── wishlist/                     # Wishlist functionality
│   │   ├── models.py                 # Wishlist and WishlistItem models
│   │   ├── views.py                  # Wishlist management APIs
│   │   └── serializers.py            # Wishlist data serializers
│   ├── media/                        # User-uploaded files
│   │   ├── categories/               # Category images
│   │   ├── products/                 # Product images
│   │   └── user_*/                   # User-specific uploads
│   ├── static/                       # Static assets
│   ├── requirements.txt              # Python dependencies
│   ├── manage.py                     # Django management script
│   ├── entrypoint.sh                 # Docker container entrypoint
│   └── setup_project.py              # Initial project setup script
├── frontend/                         # Next.js Frontend Application
│   ├── src/
│   │   ├── app/                      # Next.js App Router pages
│   │   │   ├── (auth)/               # Authentication pages group
│   │   │   │   ├── login/            # Login page
│   │   │   │   └── register/         # Registration page
│   │   │   ├── account/              # User account management
│   │   │   ├── admin/                # Admin dashboard pages
│   │   │   │   ├── login/            # Admin login
│   │   │   │   ├── products/         # Admin product management
│   │   │   │   ├── orders/           # Admin order management
│   │   │   │   └── categories/       # Admin category management
│   │   │   ├── cart/                 # Shopping cart page
│   │   │   ├── checkout/             # Checkout process
│   │   │   ├── orders/               # Order history and details
│   │   │   ├── products/             # Product catalog and details
│   │   │   ├── payment/              # Payment success/failure pages
│   │   │   ├── wishlist/             # Wishlist page
│   │   │   └── page.tsx              # Homepage
│   │   ├── components/               # Reusable React components
│   │   │   ├── ui/                   # Base UI components (Radix + Tailwind)
│   │   │   ├── auth-provider.tsx     # Authentication context
│   │   │   ├── cart-provider.tsx     # Cart state management
│   │   │   ├── wishlist-provider.tsx # Wishlist state management
│   │   │   ├── admin-provider.tsx    # Admin authentication context
│   │   │   ├── header.tsx            # Main navigation header
│   │   │   ├── product-card.tsx      # Product display component
│   │   │   └── [other components]    # Various feature components
│   │   ├── hooks/                    # Custom React hooks
│   │   └── lib/                      # Utility functions and services
│   │       ├── services/             # API service layer
│   │       │   ├── auth.ts           # Authentication services
│   │       │   ├── products.ts       # Product services
│   │       │   ├── cart.ts           # Cart services
│   │       │   ├── orders.ts         # Order services
│   │       │   └── payments.ts       # Payment services
│   │       ├── api.ts                # Axios configuration
│   │       └── utils.ts              # Helper utilities
│   ├── public/                       # Static assets
│   │   ├── placeholder-logo.png      # Brand assets
│   │   └── [other images]            # Static images
│   ├── package.json                  # Node.js dependencies and scripts
│   ├── next.config.ts                # Next.js configuration
│   ├── tailwind.config.ts            # Tailwind CSS configuration
│   ├── tsconfig.json                 # TypeScript configuration
│   └── components.json               # Shadcn/ui configuration
├── docker-compose.yml                # Multi-container orchestration
├── .env                              # Environment variables (create from template)
├── LICENSE                           # MIT License
└── README.md                         # Project documentation
```

## 🔄 Data Flow Architecture

### Frontend to Backend Communication
1. **API Layer**: Centralized API services using Axios with JWT token management
2. **State Management**: React Context API for global state (auth, cart, wishlist)
3. **Real-time Updates**: WebSocket connections for live cart and order updates
4. **Error Handling**: Comprehensive error handling with user-friendly messages

### Backend Data Processing
1. **Request Processing**: Django REST Framework with custom viewsets and serializers
2. **Business Logic**: Service layer pattern with utility modules (OrderManager, etc.)
3. **Database Layer**: Django ORM with optimized queries and foreign key relationships
4. **Signal Handling**: Django signals for cross-app communication and side effects

### Payment Flow Architecture
1. **Cart → Order**: Seamless conversion from cart items to order items
2. **Stripe Session**: Secure payment session creation with metadata
3. **Webhook Processing**: Real-time payment status updates via Stripe webhooks
4. **Order Completion**: Automatic inventory updates and order status changes

## 🔧 Development

### Backend Development
```bash
# Access backend container
docker-compose exec backend bash

# Create migrations
python manage.py makemigrations

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic
```

### Frontend Development
```bash
# Access frontend container
docker-compose exec frontend bash

# Install new packages
npm install <package-name>

# Run linting
npm run lint

# Build for production
npm run build
```

## 📊 API Endpoints Reference

### 🔐 Authentication & User Management
```http
POST   /api/auth/login/                    # User login with email/username
POST   /api/auth/register/                 # User registration
POST   /api/auth/refresh/                  # Refresh JWT access token
POST   /api/auth/logout/                   # User logout (clear tokens)
GET    /api/auth/user/                     # Get current user profile
PUT    /api/auth/user/                     # Update user profile
POST   /api/auth/change-password/          # Change user password
GET    /api/auth/check-username/{username} # Check username availability
GET    /api/auth/check-email/{email}       # Check email availability
```

### 📦 Products & Categories
```http
GET    /api/products/                      # List products with filtering & pagination
GET    /api/products/{id}/                 # Get product details with variants
GET    /api/products/top-sellers/          # Get top-selling products
GET    /api/products/new-arrivals/         # Get newest products
GET    /api/products/personalized/         # Get personalized recommendations
GET    /api/categories/                    # List all categories
GET    /api/categories/{id}/               # Get category details with products
GET    /api/categories/{id}/products/      # Get products in specific category
```

### 🛒 Shopping Cart Management
```http
GET    /api/cart/                          # Get user's cart with items
POST   /api/cart/add-item/                 # Add product variant to cart
PUT    /api/cart/update-item/              # Update cart item quantity
DELETE /api/cart/remove-item/              # Remove item from cart
DELETE /api/cart/clear/                    # Clear entire cart
GET    /api/cart/count/                    # Get cart items count
GET    /api/cart/summary/                  # Get cart summary (total price, items)
```

### 📋 Order Processing
```http
GET    /api/orders/                        # List user's orders with pagination
POST   /api/orders/create-from-cart/       # Create order from current cart
GET    /api/orders/{id}/                   # Get detailed order information
PATCH  /api/orders/{id}/status/            # Update order status (admin/cancel)
POST   /api/orders/{id}/cancel/            # Cancel pending order
GET    /api/orders/user-stats/             # Get user's order statistics
GET    /api/admin/orders/                  # Admin: List all orders
GET    /api/admin/orders/stats/            # Admin: Get order statistics
```

### 💳 Payment Processing
```http
POST   /api/payments/create-checkout-session/           # Create payment session for existing order
POST   /api/payments/create-checkout-session-from-cart/ # Create payment session directly from cart
POST   /api/payments/continue-payment/                  # Continue payment for pending order
POST   /api/payments/verify-payment/                    # Verify payment completion (dev only)
POST   /api/payments/webhook/                           # Stripe webhook endpoint (internal)
GET    /api/payments/status/{order_id}/                 # Get payment status for order
POST   /api/payments/refund/                           # Process full refund for order
GET    /api/payments/refund-status/{order_id}/          # Get refund status for order
```

### ⭐ Reviews & Ratings
```http
GET    /api/reviews/                       # List reviews with filtering
POST   /api/reviews/                       # Create new product review
GET    /api/reviews/{id}/                  # Get specific review details
PUT    /api/reviews/{id}/                  # Update user's review
DELETE /api/reviews/{id}/                  # Delete user's review
GET    /api/products/{id}/reviews/         # Get reviews for specific product
```

### ❤️ Wishlist Management
```http
GET    /api/wishlist/                      # Get user's wishlist items
POST   /api/wishlist/                      # Add product to wishlist
DELETE /api/wishlist/{id}/                 # Remove item from wishlist
POST   /api/wishlist/toggle/               # Toggle product in wishlist
DELETE /api/wishlist/clear/                # Clear entire wishlist
```

### 🏠 Address Management
```http
GET    /api/addresses/                     # List user's saved addresses
POST   /api/addresses/                     # Create new address
PUT    /api/addresses/{id}/                # Update existing address
DELETE /api/addresses/{id}/                # Delete address
POST   /api/addresses/{id}/set-default/    # Set address as default
```

### 🛡️ Admin Panel APIs
```http
GET    /api/admin/dashboard/stats/         # Dashboard statistics
GET    /api/admin/products/                # Admin product management
POST   /api/admin/products/                # Create new product
PUT    /api/admin/products/{id}/           # Update product
DELETE /api/admin/products/{id}/           # Delete product
GET    /api/admin/categories/              # Admin category management
GET    /api/admin/users/                   # User management
GET    /api/admin/payments/analytics/      # Payment analytics
```

### 📄 Query Parameters & Filtering

#### Products Filtering
- `?category={id}` - Filter by category
- `?search={query}` - Search in product names and descriptions
- `?min_price={amount}&max_price={amount}` - Price range filtering
- `?rating_min={value}` - Minimum rating filter
- `?ordering={field}` - Sort by: name, price, rating, created_at
- `?page={number}&page_size={size}` - Pagination controls

#### Orders Filtering
- `?status={status}` - Filter by order status
- `?date_from={date}&date_to={date}` - Date range filtering
- `?is_paid={true/false}` - Filter by payment status

#### Reviews Filtering
- `?product={id}` - Filter reviews for specific product
- `?rating={value}` - Filter by rating value
- `?user={id}` - Filter reviews by user (admin only)

## 🔒 Security & Compliance Features

### 🛡️ Authentication & Authorization
- **JWT Token Security**: Secure token-based authentication with automatic refresh
- **Role-Based Access**: Separate admin and user authentication systems
- **Password Security**: Strong password requirements with validation
- **Session Management**: Secure session handling with automatic cleanup
- **Rate Limiting**: Protection against brute force attacks

### 💳 Payment Security
- **PCI Compliance**: Stripe handles all sensitive payment data securely
- **Webhook Verification**: Cryptographic signature verification for webhooks
- **Payment Intent Tracking**: Complete payment lifecycle monitoring
- **Fraud Detection**: Built-in Stripe fraud prevention
- **Secure Checkout**: Encrypted payment processing with SSL

### 🔐 Data Protection
- **Input Validation**: Comprehensive server-side input validation
- **SQL Injection Prevention**: Django ORM protection against SQL injection
- **XSS Protection**: Cross-site scripting prevention measures
- **CSRF Protection**: Cross-site request forgery protection
- **File Upload Security**: Secure file upload with type validation

### 🌐 Infrastructure Security
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Variables**: Sensitive data stored in environment variables
- **Database Security**: Secure database connections and access controls
- **API Security**: Rate limiting and authentication on all endpoints
- **HTTPS Ready**: SSL/TLS encryption support for production

## 🧪 Testing & Quality Assurance

### Backend Testing
```bash
# Run all backend tests
docker-compose exec backend python manage.py test

# Run specific app tests
docker-compose exec backend python manage.py test products
docker-compose exec backend python manage.py test orders
docker-compose exec backend python manage.py test payments

# Run tests with coverage
docker-compose exec backend python manage.py test --with-coverage
```

### Frontend Testing
```bash
# Run frontend tests
docker-compose exec frontend npm test

# Run tests in watch mode
docker-compose exec frontend npm run test:watch

# Run e2e tests
docker-compose exec frontend npm run test:e2e

# Generate test coverage report
docker-compose exec frontend npm run test:coverage
```

### API Testing
```bash
# Test API endpoints using curl
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/products/

# Test payment webhook (development)
curl -X POST http://localhost:8000/api/payments/webhook/ \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {...}}'
```

## 💳 Payment Features

### Stripe Integration
- **Secure Checkout**: PCI-compliant payment processing via Stripe Checkout
- **Multiple Payment Methods**: Credit cards, debit cards, and digital wallets
- **Real-time Validation**: Instant payment verification and fraud detection
- **International Support**: Multi-currency support for global transactions

### Payment Flow
1. **Cart to Checkout**: Seamless transition from cart to payment
2. **Address Validation**: Shipping address collection and validation
3. **Order Creation**: Pre-payment order creation with pending status
4. **Payment Session**: Time-limited Stripe checkout session (60 seconds)
5. **Webhook Processing**: Real-time payment status updates
6. **Order Completion**: Automatic order status update upon successful payment

### Advanced Payment Features
- **Duplicate Prevention**: Smart detection of duplicate payment attempts
- **Session Recovery**: Resume payment for pending orders
- **Payment Timeout**: Automatic order cancellation for expired sessions
- **Stock Management**: Real-time inventory updates during payment flow
- **Refund Processing**: Full refund capability with automatic stock restoration

### Admin Payment Management
- **Transaction Monitoring**: Complete payment transaction dashboard
- **Payment Analytics**: Revenue tracking and payment statistics
- **Refund Management**: Admin-initiated refunds with detailed tracking
- **Dispute Handling**: Chargeback and dispute management system

### Security & Compliance
- **PCI Compliance**: Stripe handles all sensitive payment data
- **Webhook Verification**: Secure webhook signature validation
- **Payment Intent Tracking**: Complete payment lifecycle monitoring
- **Fraud Protection**: Built-in fraud detection and prevention

## 📦 Production Deployment Guide

### 🚀 Deployment Checklist

#### Environment Configuration
1. **Create Production Environment File**:
   ```env
   # Production Database Configuration
   MYSQL_ROOT_PASSWORD=secure_root_password_here
   MYSQL_DATABASE=ecommerce_production
   MYSQL_USER=ecommerce_user
   MYSQL_PASSWORD=secure_database_password_here
   
   # Django Production Settings
   SECRET_KEY=your_secure_production_secret_key_here
   DEBUG=False
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   
   # Stripe Production Keys
   STRIPE_SECRET_KEY=sk_live_your_production_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_publishable_key
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   
   # Frontend Production Configuration
   NEXT_PUBLIC_API_URL=https://yourdomain.com/api
   NEXT_PUBLIC_WS_HOST=yourdomain.com
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_stripe_publishable_key
   ```

#### Security Configuration
2. **SSL/TLS Certificate Setup**:
   - Configure SSL certificates for HTTPS
   - Update ALLOWED_HOSTS in Django settings
   - Enable SECURE_SSL_REDIRECT in production

3. **Database Security**:
   - Use strong database passwords
   - Configure database firewall rules
   - Enable database encryption at rest

4. **Payment Security**:
   - Configure production Stripe webhook endpoints
   - Enable webhook signature verification
   - Set up proper CORS policies for payment endpoints

#### Performance Optimization
5. **Static File Serving**:
   ```bash
   # Collect static files
   docker-compose exec backend python manage.py collectstatic --noinput
   
   # Configure nginx/CDN for static file serving
   ```

6. **Database Optimization**:
   ```bash
   # Run database migrations
   docker-compose exec backend python manage.py migrate
   
   # Create database indexes for performance
   docker-compose exec backend python manage.py dbshell
   ```

### 🐳 Docker Production Setup

#### Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
    depends_on:
      - db
    volumes:
      - static_volume:/app/static
      - media_volume:/app/media

  db:
    image: mysql:8.0
    ports:
      - "3306:3306"
    volumes:
      - mysql_prod_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/static
      - media_volume:/media
    depends_on:
      - frontend
      - backend

volumes:
  mysql_prod_data:
  static_volume:
  media_volume:
```

#### Deployment Commands
```bash
# Build and deploy production containers
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser account
docker-compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collect static files
docker-compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### ☁️ Cloud Deployment Options

#### AWS Deployment
- **ECS/Fargate**: Container orchestration
- **RDS**: Managed MySQL database
- **S3**: Static file and media storage
- **CloudFront**: CDN for static assets
- **ALB**: Application load balancer
- **Route 53**: DNS management

#### Google Cloud Platform
- **Cloud Run**: Serverless container deployment
- **Cloud SQL**: Managed MySQL instance
- **Cloud Storage**: File storage
- **Cloud CDN**: Content delivery network
- **Cloud Load Balancing**: Traffic distribution

#### DigitalOcean
- **App Platform**: Platform-as-a-Service deployment
- **Managed Databases**: MySQL database hosting
- **Spaces**: Object storage for media files
- **Load Balancer**: Traffic distribution

### 🔧 Monitoring & Maintenance

#### Health Checks
```bash
# Backend health check
curl https://yourdomain.com/api/health/

# Database connectivity check
curl https://yourdomain.com/api/health/db/

# Payment system check
curl https://yourdomain.com/api/payments/health/
```

#### Log Management
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database logs
docker-compose logs -f db

# Nginx access logs
docker-compose logs -f nginx
```

#### Backup Strategy
```bash
# Database backup
docker-compose exec db mysqldump -u root -p ecommerce_production > backup_$(date +%Y%m%d).sql

# Media files backup
tar -czf media_backup_$(date +%Y%m%d).tar.gz ./backend/media/

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec db mysqldump -u root -p$MYSQL_ROOT_PASSWORD $MYSQL_DATABASE > "backup_${DATE}.sql"
aws s3 cp "backup_${DATE}.sql" s3://your-backup-bucket/database/
```

### 📈 Scaling Considerations

#### Horizontal Scaling
- Load balancer configuration for multiple backend instances
- Database read replicas for improved performance
- CDN setup for static asset delivery
- Container orchestration with Kubernetes

#### Vertical Scaling
- Resource allocation optimization
- Database performance tuning
- Memory and CPU optimization
- Connection pooling configuration

#### Performance Monitoring
- Application performance monitoring (APM)
- Database query optimization
- Cache implementation (Redis/Memcached)
- Real-time error tracking

## 🤝 Contributing Guidelines

We welcome contributions to improve this e-commerce platform! Please follow these guidelines:

### 🔄 Development Workflow
1. **Fork the Repository**
   ```bash
   git clone https://github.com/your-username/E-Commerce.git
   cd E-Commerce
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

3. **Set Up Development Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Update environment variables
   nano .env
   
   # Start development environment
   docker-compose up --build
   ```

4. **Make Your Changes**
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

5. **Test Your Changes**
   ```bash
   # Backend tests
   docker-compose exec backend python manage.py test
   
   # Frontend tests
   docker-compose exec frontend npm test
   
   # Integration tests
   docker-compose exec backend python manage.py test --settings=backend.settings.test
   ```

6. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   git push origin feature/amazing-new-feature
   ```

7. **Create Pull Request**
   - Provide clear description of changes
   - Include screenshots for UI changes
   - Reference any related issues
   - Ensure CI/CD checks pass

### 📝 Code Style Guidelines

#### Backend (Django)
- Follow PEP 8 style guidelines
- Use Django best practices and conventions
- Write docstrings for all functions and classes
- Use type hints where appropriate
- Follow Django REST Framework patterns

#### Frontend (Next.js/TypeScript)
- Use TypeScript for type safety
- Follow React/Next.js best practices
- Use Tailwind CSS for styling
- Follow component composition patterns
- Write JSDoc comments for complex functions

#### Database
- Use descriptive field names
- Include proper foreign key relationships
- Add database indexes for performance
- Write migration scripts for schema changes

### 🐛 Bug Reports
When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce the problem
- Expected vs actual behavior
- Environment details (OS, browser, etc.)
- Screenshots or error logs if applicable

### 💡 Feature Requests
For new features, please provide:
- Clear description of the proposed feature
- Use case or problem it solves
- Potential implementation approach
- Mockups or wireframes if applicable

### 🔍 Code Review Process
- All code changes require review
- Ensure tests pass and coverage is maintained
- Follow security best practices
- Check for performance implications
- Verify documentation is updated

### 📋 Development Setup Requirements
- Docker and Docker Compose
- Git for version control
- Node.js 18+ (for local frontend development)
- Python 3.10+ (for local backend development)
- MySQL 8.0 (or use Docker container)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary
- ✅ Commercial use allowed
- ✅ Modification allowed  
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No warranty provided
- ❌ No liability

## 📞 Support & Community

### 🆘 Getting Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Email**: Contact the development team at [your-email@domain.com]

### 🌟 Show Your Support
If you find this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- 🔀 Contributing code improvements
- 📢 Sharing with others

### 📊 Project Stats
- **Languages**: Python, TypeScript, JavaScript
- **Framework**: Django, Next.js
- **Database**: MySQL
- **Deployment**: Docker, Docker Compose
- **Payment**: Stripe Integration
- **Authentication**: JWT Tokens

---

## 🏆 Acknowledgments

Special thanks to all contributors and the open-source community for making this project possible:

- **Django & DRF Team** - For the amazing backend framework
- **Next.js Team** - For the powerful React framework
- **Radix UI** - For accessible UI components
- **Tailwind CSS** - For utility-first CSS framework
- **Stripe** - For secure payment processing
- **Docker** - For containerization technology

Built with ❤️ using modern web technologies - Django REST Framework, Next.js 15, Stripe Payments, and Docker

### 🔗 Useful Links
- [Django Documentation](https://docs.djangoproject.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Docker Documentation](https://docs.docker.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Happy Coding! 🚀**
