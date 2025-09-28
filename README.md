# Sharma's Pet Nation - Complete Pet Adoption Platform

A full-stack web application for pet adoption and e-commerce built with Node.js, Express, SQLite, and Stripe payment integration.

## Features

### Frontend
- **Responsive Design**: Modern, mobile-friendly UI
- **Pet Gallery**: Browse available pets with detailed information
- **Shop**: E-commerce section for pet supplies and accessories
- **Adoption System**: Complete adoption request workflow
- **User Authentication**: Login/register system
- **Support System**: Contact form and ticket system

### Backend
- **RESTful API**: Complete API endpoints for all features
- **Authentication**: JWT-based user authentication
- **Database**: SQLite database with comprehensive schema
- **Payment Integration**: Stripe payment gateway
- **Admin Panel**: User and content management
- **Security**: Rate limiting, input validation, and error handling

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite3
- **Authentication**: JWT (JSON Web Tokens)
- **Payment**: Stripe API
- **Security**: Helmet, CORS, Rate Limiting

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Stripe account (for payment processing)

### 1. Clone and Install Dependencies
```bash
# Navigate to project directory
cd Dogs-Website-master

# Install backend dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy environment template
cp env.example .env

# Edit .env file with your configuration
nano .env
```

**Required Environment Variables:**
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./database/pets.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Stripe Payment Gateway
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Admin Configuration
ADMIN_EMAIL=admin@sharmapetnation.com
ADMIN_PASSWORD=admin123
```

### 3. Initialize Database
```bash
# Initialize database with sample data
npm run init-db
```

### 4. Start the Server
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Pets
- `GET /api/pets` - Get all pets (with filtering)
- `GET /api/pets/:id` - Get single pet
- `POST /api/pets` - Create pet (Admin only)
- `PUT /api/pets/:id` - Update pet (Admin only)
- `DELETE /api/pets/:id` - Delete pet (Admin only)
- `GET /api/pets/featured` - Get featured pets

### Adoption
- `POST /api/adoption/request` - Submit adoption request
- `GET /api/adoption/requests` - Get adoption requests (Admin)
- `PUT /api/adoption/requests/:id/status` - Update request status (Admin)
- `GET /api/adoption/my-requests` - Get user's adoption requests

### Shop
- `GET /api/shop/products` - Get shop products
- `GET /api/shop/products/:id` - Get single product
- `POST /api/shop/products` - Create product (Admin only)
- `PUT /api/shop/products/:id` - Update product (Admin only)
- `DELETE /api/shop/products/:id` - Delete product (Admin only)
- `GET /api/shop/categories` - Get product categories
- `GET /api/shop/featured` - Get featured products

### Payment
- `POST /api/payment/create-intent` - Create payment intent
- `POST /api/payment/confirm` - Confirm payment
- `POST /api/payment/webhook` - Stripe webhook
- `GET /api/payment/history` - Get payment history

### Users
- `GET /api/users` - Get all users (Admin only)
- `GET /api/users/:id` - Get single user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (Admin only)
- `GET /api/users/stats` - Get user statistics (Admin only)

### Support
- `POST /api/support/tickets` - Submit support ticket
- `GET /api/support/tickets` - Get support tickets (Admin only)
- `PUT /api/support/tickets/:id` - Update ticket (Admin only)
- `GET /api/support/my-tickets` - Get user's tickets

## Database Schema

### Tables
- **users** - User accounts and profiles
- **pets** - Pet information and availability
- **adoption_requests** - Adoption applications
- **shop_products** - E-commerce products
- **orders** - Customer orders
- **order_items** - Order line items
- **payments** - Payment transactions
- **support_tickets** - Customer support

## Default Admin Account

After database initialization, you can login with:
- **Username**: admin
- **Email**: admin@sharmapetnation.com
- **Password**: admin123

## Stripe Setup

### 1. Create Stripe Account
1. Sign up at [stripe.com](https://stripe.com)
2. Get your API keys from the dashboard

### 2. Configure Webhooks
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `http://your-domain.com/api/payment/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy webhook secret to `.env` file

### 3. Test Payments
Use Stripe test cards:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

## File Structure

```
Dogs-Website-master/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── env.example              # Environment variables template
├── README.md                # This file
├── database/
│   └── init.js              # Database initialization
├── middleware/
│   ├── auth.js              # Authentication middleware
│   ├── errorHandler.js      # Error handling
│   └── notFound.js          # 404 handler
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── pets.js              # Pet management routes
│   ├── adoption.js          # Adoption system routes
│   ├── shop.js              # E-commerce routes
│   ├── payment.js           # Payment processing routes
│   ├── users.js             # User management routes
│   └── support.js           # Support system routes
├── js/
│   └── app.js               # Frontend JavaScript
├── index.html               # Home page
├── Login.html               # Login page
├── adoption.html            # Adoption page
├── support.html             # Support page
├── shop.html                # Shop page
├── available-pets.html      # Available pets page
└── style.css                # Main stylesheet
```

## Development

### Running in Development Mode
```bash
npm run dev
```
This uses nodemon for auto-reload on file changes.

### Database Management
```bash
# Initialize/reset database
npm run init-db

# Database file location: ./database/pets.db
```

### Adding New Features
1. Create routes in `routes/` directory
2. Add middleware in `middleware/` directory
3. Update frontend in `js/app.js`
4. Test with API endpoints

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent abuse and DDoS
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Cross-origin request security
- **Helmet**: Security headers
- **Password Hashing**: bcrypt for password security

## Error Handling

- Comprehensive error middleware
- Validation error responses
- Database error handling
- Payment error handling
- User-friendly error messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@sharmapetnation.com or create a support ticket through the website.

## Changelog

### v1.0.0
- Initial release
- Complete pet adoption platform
- Stripe payment integration
- User authentication system
- Admin panel functionality
- Responsive frontend design
