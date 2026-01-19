# E-Commerce Platform

A modern, production-ready full-stack e-commerce application with **Django REST Framework**, **Next.js 15**, **Redis caching**, and **Stripe payments**. Features NGINX reverse proxy, Uvicorn ASGI server, and Docker containerization for optimal performance.

## ✨ Key Features

- 💳 **Stripe Payment Integration** - Secure checkout, webhooks, refunds
- 🛍️ **Product Management** - Variants, categories, reviews, wishlist
- 🛒 **Shopping Cart** - Persistent cart, guest checkout, real-time updates
- 👤 **User Authentication** - JWT tokens, profiles, order history
- ⚡ **Redis Caching** - 90-95% faster API responses
- 🎨 **Modern UI** - Next.js 15, TypeScript, Tailwind CSS, Radix UI
- 🔒 **Security** - PCI-compliant, rate limiting, input validation
- 📦 **Admin Panel** - Django admin for product/order management

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Radix UI |
| **Backend** | Django 5.1, Django REST Framework, Uvicorn ASGI |
| **Database** | MySQL 8.0 |
| **Cache** | Redis 7.x (90-95% faster responses) |
| **Payment** | Stripe API with webhooks |
| **Web Server** | NGINX (reverse proxy + static files) |
| **Deployment** | Docker + Docker Compose |

## 📋 Prerequisites

- Docker & Docker Compose
- Stripe Account (for payments)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd E-Commerce
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
# Database
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=ecommerce_db
MYSQL_USER=ecommerce_user
MYSQL_PASSWORD=ecommerce_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### 3. Start the Application
```bash
docker compose up --build
# Or detached mode
docker compose up -d --build
```

### 4. Seed Sample Data (Optional)
```bash
docker compose exec backend python manage.py seed_categories
docker compose exec backend python manage.py seed_colors
docker compose exec backend python manage.py seed_products
docker compose exec backend python manage.py seed_productVariant
```

### 5. Test Stripe Payments
Use test card: `4242 4242 4242 4242` (any future date, any CVC)

## 📱 Access

- **Frontend**: http://localhost (Port 80)
- **Backend API**: http://localhost/api
- **Admin Panel**: http://localhost:8080/admin (admin/admin123)
- **MySQL**: localhost:3306
- **Redis**: localhost:6379

### Architecture
```
Client → NGINX → Frontend (Next.js:3000) + Backend (Uvicorn:8000)
Backend ↔ Redis (Cache) + MySQL (Database)
```

### Performance
- ⚡ **10-100x faster** with NGINX + Uvicorn ASGI
- 🚀 **90-95% faster** API responses with Redis caching
- 📊 Production-ready for horizontal scaling

## 📚 Documentation

- **[NGINX_UVICORN_SETUP.md](NGINX_UVICORN_SETUP.md)** - Architecture guide
- **[REDIS_OPTIMIZATION.md](backend/REDIS_OPTIMIZATION.md)** - Caching guide
- **[LINUX_DEPLOYMENT_GUIDE.md](LINUX_DEPLOYMENT_GUIDE.md)** - Production deployment

## 🏗 Project Structure

```
E-Commerce/
├── backend/                    # Django REST API
│   ├── products/              # Product catalog
│   ├── cart/                  # Shopping cart
│   ├── orders/                # Order processing
│   ├── payments/              # Stripe integration
│   ├── users/                 # Authentication
│   └── reviews/wishlist/      # Reviews & wishlist
├── frontend/                  # Next.js 15 App
│   └── src/
│       ├── app/               # App Router pages
│       ├── components/        # React components
│       └── lib/               # Utils & services
├── nginx/                     # NGINX config
├── docker-compose.yml         # Docker orchestration
└── .env                       # Environment vars
```

## 🔧 Development

```bash
# Backend
docker compose exec backend bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

# Frontend
docker compose exec frontend bash
npm install <package>

# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Cache management
docker compose exec backend python manage.py warmup_cache --verbose
docker compose exec backend python manage.py clear_product_cache --all
```

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/register/` - User registration
- `GET /api/auth/user/` - Get user profile

### Products
- `GET /api/products/` - List products (cached)
- `GET /api/products/{id}/` - Product details (cached)
- `GET /api/products/top-sellers/` - Top sellers (cached)

### Cart & Orders
- `GET /api/cart/` - Get cart
- `POST /api/cart/add-item/` - Add to cart
- `POST /api/orders/create-from-cart/` - Create order

### Payments
- `POST /api/payments/create-checkout-session/` - Create payment
- `POST /api/payments/webhook/` - Stripe webhook

### Admin
- `GET /api/admin/products/` - Manage products
- `GET /api/admin/orders/` - Manage orders

## 🧪 Testing

```bash
# Backend tests
docker compose exec backend python manage.py test

# Frontend tests
docker compose exec frontend npm test

# Test specific app
docker compose exec backend python manage.py test products
```

## 🚀 Production Deployment

See [LINUX_DEPLOYMENT_GUIDE.md](LINUX_DEPLOYMENT_GUIDE.md) for detailed deployment guide.

Quick production commands:
```bash
# Build production
docker compose -f docker-compose.prod.yml up -d --build

# Migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/dinhhoang235/E-Commerce/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dinhhoang235/E-Commerce/discussions)

---

Built with ❤️ using Django REST Framework, Next.js 15, Redis, Stripe, and Docker

**Tech Stack**: Django 5.1 • Next.js 15 • TypeScript • MySQL 8.0 • Redis 7.x • Stripe • NGINX • Docker
