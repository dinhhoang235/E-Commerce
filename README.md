# E-Commerce Platform

A full-stack e-commerce application built with Django REST Framework backend and Next.js frontend, containerized with Docker.

## 🚀 Features

### Backend (Django REST Framework)
- **User Management**: Custom user profiles with authentication and authorization
- **Product Catalog**: Product and category management with image uploads
- **Shopping Cart**: Add, remove, and manage cart items
- **Order Management**: Complete order processing and tracking
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
- **Checkout Process**: Complete checkout flow with order confirmation
- **Admin Dashboard**: Administrative interface for managing products and orders
- **Dark/Light Theme**: Theme switching support

## 🛠 Technology Stack

### Backend
- **Framework**: Django 5.1.2
- **API**: Django REST Framework 3.14.0
- **Database**: MySQL 8.0
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
- **Development**: Hot reloading for both frontend and backend

## 📋 Prerequisites

- Docker and Docker Compose
- Git

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

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_WS_HOST=localhost:8000
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

## 🔒 Security Features

- JWT token-based authentication
- CORS configuration for cross-origin requests
- Input validation and sanitization
- Secure file upload handling
- Environment variable configuration

## 🧪 Testing

```bash
# Backend tests
docker-compose exec backend python manage.py test

# Frontend tests
docker-compose exec frontend npm test
```

## 📦 Production Deployment

1. Update environment variables for production
2. Set `DEBUG=False` in Django settings
3. Configure proper ALLOWED_HOSTS
4. Set up SSL certificates
5. Use production database settings
6. Configure static file serving

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

Built with ❤️ using Django, Next.js, and Docker