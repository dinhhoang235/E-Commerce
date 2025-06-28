# E-Commerce Platform

A full-stack e-commerce application built with Django REST Framework backend and designed for a React frontend.

## Features

### User Management
- User registration and authentication with JWT tokens
- User profile management
- Multiple shipping addresses management
- Password change functionality

### Product Management
- Product catalog with categories
- Product search and filtering by price, rating, and category
- Product reviews and ratings
- Product images with automatic thumbnail generation

### Shopping Experience
- Shopping cart functionality (add, update, remove items)
- Order creation and tracking
- Shipping address selection for orders

### Admin Features
- Admin dashboard for product management
- Order status management
- User management

## Tech Stack

### Backend
- **Framework**: Django 5.1.2, Django REST Framework 3.14.0
- **Database**: MySQL 8.0
- **Authentication**: JWT with Simple JWT
- **Image Processing**: Pillow 10.2.0
- **Filtering**: django-filter 25.1

### Frontend
- **Framework**: React (to be implemented)

### Deployment
- **Containerization**: Docker and Docker Compose

## Project Structure

```
E_commerce/
├── backend/
│   ├── backend/            # Main Django project settings
│   ├── users/              # User management app
│   ├── products/           # Product catalog app
│   ├── cart/               # Shopping cart app
│   ├── orders/             # Order processing app
│   ├── media/              # Uploaded product images
│   ├── static/             # Static files
│   ├── requirements.txt    # Python dependencies
│   ├── Dockerfile          # Backend container config
│   └── entrypoint.sh       # Container startup script
├── frontend/               # React frontend (to be implemented)
├── docker-compose.yml      # Docker compose configuration
├── .env                    # Environment variables
└── README.md               # Project documentation
```

## API Endpoints

### Authentication
- `POST /api/register/`: User registration
- `POST /api/login/`: User login
- `POST /api/logout/`: User logout
- `POST /api/token/`: Obtain JWT token
- `POST /api/token/refresh/`: Refresh JWT token
- `POST /api/token/verify/`: Verify JWT token

### User Management
- `GET /api/profile/`: Get user profile
- `PUT /api/profile/`: Update user profile
- `POST /api/password/change_password/`: Change password
- `GET, POST /api/address/`: List and create shipping addresses
- `GET, PUT, DELETE /api/address/{id}/`: Manage specific shipping address
- `POST /api/address/{id}/set_default/`: Set default shipping address

### Products
- `GET /api/categories/`: List all categories
- `GET /api/products/`: List all products with filtering options
- `GET /api/products/{id}/`: Get product details
- `GET /api/reviews/?product={id}`: Get reviews for a product
- `POST /api/reviews/`: Add a new product review

### Cart
- `GET /api/cart/view/`: View current cart
- `POST /api/cart/add/`: Add product to cart
- `PATCH /api/cart/update_item/`: Update cart item quantity
- `DELETE /api/cart/remove-item/`: Remove item from cart
- `DELETE /api/cart/clear/`: Clear entire cart

### Orders
- `GET /api/orders/`: List user's orders
- `POST /api/orders/`: Create a new order
- `GET /api/orders/{id}/`: Get order details
- `POST /api/orders/{id}/add_item/`: Add item to an existing order
- `PATCH /api/orders/{id}/update_status/`: Update order status (admin only)
- `GET /api/orders/shipping_addresses/`: Get user's shipping addresses for checkout

## Installation and Setup

### Prerequisites
- Docker and Docker Compose
- MySQL

### Environment Configuration
Create a `.env` file with the following variables:
```
# Django settings
DEBUG=True
SECRET_KEY=your_secret_key
ALLOWED_HOSTS=localhost,127.0.0.1

# Database settings
DB_ENGINE=django.db.backends.mysql
DB_NAME=e_commerce
DB_USER=admin
DB_PASSWORD=admin123
DB_HOST=db
DB_PORT=3306

# Database Configuration
MYSQL_ROOT_PASSWORD=admin123
MYSQL_DATABASE=e_commerce
MYSQL_USER=admin
MYSQL_PASSWORD=admin123

# Backend Configuration
DJANGO_PORT=8000

# Frontend Configuration
REACT_APP_API_URL=http://localhost:3000/api
```

### Running with Docker
1. Clone the repository
2. Set up your `.env` file
3. Run `docker-compose up -d`
4. Access the backend at http://localhost:8000

### Development Setup
1. Start the database: `docker-compose up -d db`
2. Install backend dependencies: `pip install -r backend/requirements.txt`
3. Run migrations: `python backend/manage.py migrate`
4. Create superuser: `python backend/setup_project.py`
5. Start backend server: `python backend/manage.py runserver`

## Access
- Admin interface: http://localhost:8000/admin
- API: http://localhost:8000/api/

## Future Development
- Integration with payment gateways
- Implementation of React frontend
- Product recommendations
- Email notifications
- Order tracking