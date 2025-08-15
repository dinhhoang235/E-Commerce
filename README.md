# E-Commerce Platform

A full-stack e-commerce application built with Django REST Framework backend and Next.js frontend, containerized with Docker.

## 🚀 Features

### Payment System
- **Stripe Integration**: Secure payment processing with Stripe Checkout
- **Multiple Payment Methods**: Support for credit/debit cards
- **Payment Sessions**: Time-limited payment sessions with countdown timers
- **Duplicate Prevention**: Smart detection and prevention of duplicate orders
- **Payment Verification**: Comprehensive payment verification and order completion
- **Webhook Handling**: Real-time payment status updates via Stripe webhooks
- **Refund Management**: Full refund processing with automatic stock restoration
- **Payment Analytics**: Transaction tracking and payment statistics for administrators
- **Session Recovery**: Continue payment for pending orders
- **Fraud Protection**: Built-in chargeback and dispute handling

### Backend (Django REST Framework)
- **User Management**: Custom user profiles with authentication and authorization
- **Product Catalog**: Product and category management with image uploads
- **Shopping Cart**: Add, remove, and manage cart items
- **Order Management**: Complete order processing and tracking
- **Payment Processing**: Secure Stripe integration with comprehensive payment handling
- **Admin Panel**: Administrative interface for managing all aspects
- **Review System**: Product reviews and ratings
- **JWT Authentication**: Secure token-based authentication
- **API Documentation**: RESTful API with filtering and pagination

### Frontend (Next.js)
- **Modern UI**: Built with Radix UI components and Tailwind CSS
- **Responsive Design**: Mobile-first responsive design
- **User Authentication**: Login, registration, and user account management
- **Product Browsing**: Browse products by categories with search and filtering
- **Shopping Cart**: Interactive shopping cart with real-time updates
- **Checkout Process**: Complete checkout flow with secure Stripe payment integration
- **Payment Management**: Comprehensive payment handling with time-limited sessions
- **Admin Dashboard**: Administrative interface for managing products, orders, and payments
- **Dark/Light Theme**: Theme switching support

## 🛠 Technology Stack

### Backend
- **Framework**: Django 5.1.2
- **API**: Django REST Framework 3.14.0
- **Database**: MySQL 8.0
- **Payment Processing**: Stripe
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Image Processing**: Pillow
- **CORS**: django-cors-headers
- **Environment**: python-dotenv

### Frontend
- **Framework**: Next.js 15.2.4
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Carousel**: Embla Carousel

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: MySQL 8.0
- **Payment Gateway**: Stripe
- **Development**: Hot reloading for both frontend and backend

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

## 🏗 Project Structure

```
E-Commerce/
├── backend/                    # Django REST API
│   ├── adminpanel/            # Admin management app
│   ├── backend/               # Django project settings
│   ├── cart/                  # Shopping cart functionality
│   ├── orders/                # Order management
│   ├── payments/              # Payment processing with Stripe
│   ├── products/              # Product catalog
│   ├── reviews/               # Product reviews
│   ├── users/                 # User management
│   ├── media/                 # User uploads
│   ├── static/                # Static files
│   ├── requirements.txt       # Python dependencies
│   └── manage.py              # Django management script
├── frontend/                  # Next.js application
│   ├── src/
│   │   ├── app/              # App router pages
│   │   ├── components/       # Reusable components
│   │   ├── hooks/            # Custom React hooks
│   │   └── lib/              # Utility functions
│   ├── public/               # Static assets
│   └── package.json          # Node dependencies
├── docker-compose.yml        # Multi-container setup
└── README.md                 # Project documentation
```

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

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `POST /api/auth/refresh/` - Refresh JWT token

### Products
- `GET /api/products/` - List products
- `GET /api/products/{id}/` - Product details
- `GET /api/categories/` - List categories

### Cart
- `GET /api/cart/` - Get cart items
- `POST /api/cart/` - Add to cart
- `PUT /api/cart/{id}/` - Update cart item
- `DELETE /api/cart/{id}/` - Remove from cart

### Orders
- `GET /api/orders/` - List user orders
- `POST /api/orders/` - Create order
- `GET /api/orders/{id}/` - Order details

### Payments
- `POST /api/payments/create-checkout-session/` - Create payment session for existing order
- `POST /api/payments/create-checkout-session-from-cart/` - Create payment session directly from cart
- `POST /api/payments/continue-payment/` - Continue payment for pending order
- `POST /api/payments/verify-payment/` - Verify payment completion (development)
- `POST /api/payments/webhook/` - Stripe webhook endpoint for real-time updates
- `GET /api/payments/status/{order_id}/` - Get payment status for order
- `POST /api/payments/refund/` - Process full refund for order
- `GET /api/payments/refund-status/{order_id}/` - Get refund status for order

## 🔒 Security Features

- JWT token-based authentication
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Secure file upload handling
- Environment variable configuration
- PCI-compliant payment processing via Stripe
- Webhook signature verification

## 🧪 Testing

```bash
# Backend tests
docker-compose exec backend python manage.py test

# Frontend tests
docker-compose exec frontend npm test
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

## 📦 Production Deployment

### Payment Configuration for Production
1. **Stripe Account Setup**:
   - Create production Stripe account
   - Configure webhook endpoints
   - Set up payment methods and currencies

2. **Environment Variables**:
   ```env
   STRIPE_SECRET_KEY=sk_live_your_production_key
   STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key
   STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
   ```

3. **Security Considerations**:
   - Enable webhook signature verification
   - Configure SSL certificates for secure payment processing
   - Set up proper CORS policies for payment endpoints

### General Deployment Steps
1. Update environment variables for production
2. Set `DEBUG=False` in Django settings
3. Configure proper ALLOWED_HOSTS
4. Set up SSL certificates
5. Use production database settings
6. Configure static file serving
7. Set up payment webhook endpoints
8. Enable Stripe webhook signature verification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Django, Next.js, Stripe, and Docker
