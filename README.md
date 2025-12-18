# Sharma's Pet Nation - Modern Pet Adoption Platform

A beautiful, modern pet adoption and e-commerce platform inspired by Puppiezo.com, built with Node.js, Express, SQLite, and featuring a premium orange/teal design system.

![Sharma's Pet Nation](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-2.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🎨 Design Highlights

**Puppiezo-Inspired Modern Design:**
- 🧡 **Vibrant Color Scheme**: Orange (#F07010) primary with Teal (#008BA3) secondary
- 📱 **Floating Contact Sidebar**: Always-accessible Call, WhatsApp, and Inquiry buttons
- 🏷️ **Premium Pet Badges**: Gold, Platinum, and Silver tier system
- 🎯 **Multiple CTAs**: Call, WhatsApp, and View Details buttons on every pet card
- 🎨 **Pastel Breed Cards**: Beautiful pastel backgrounds with elevated images
- ✨ **Modern Typography**: Poppins font family for professional appearance
- 📐 **Responsive Design**: Seamless experience across all devices

## ✨ Features

### Frontend
- **Modern UI/UX**: Puppiezo-inspired design with orange/teal color scheme
- **Auto-Playing Hero Slider**: 4 slides with smooth transitions and pagination
- **Two-Tier Header**: Top bar with contact info + main navigation with search
- **Floating Contact Sidebar**: Quick access to Call, WhatsApp, and Inquiry
- **Enhanced Pet Cards**: Premium badges (Gold/Platinum/Silver) with multiple CTAs
- **Pastel Breed Cards**: Eye-catching cards with unique pastel backgrounds
- **Responsive Design**: Mobile-first approach with smooth transitions
- **Interactive Elements**: Hover effects, smooth scrolling, and animations

### Backend
- **RESTful API**: Complete API endpoints for all features
- **Authentication**: JWT-based user authentication
- **Database**: SQLite database with comprehensive schema
- **Payment Integration**: Stripe payment gateway
- **Admin Panel**: User and content management
- **Security**: Rate limiting, input validation, and error handling

## 🚀 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern design system with CSS variables
- **JavaScript** - Vanilla JS for interactivity
- **Google Fonts** - Poppins typography

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database
- **JWT** - Authentication
- **Stripe** - Payment processing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## 📦 Installation & Setup

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

## 🎯 Key Pages

### Homepage (`index.html`)
- **Hero Section**: Gradient background with clear value proposition
- **Featured Breeds**: Pastel cards showcasing popular breeds
- **Available Pets**: Premium pet cards with badges and multiple CTAs
- **Why Choose Us**: 6 feature cards highlighting platform benefits
- **Multi-Column Footer**: Comprehensive navigation and contact info

### Available Pets (`available-pets.html`)
- **6 Pet Listings**: Each with Gold/Platinum/Silver badges
- **Multiple CTAs**: Call, WhatsApp, and Adopt Now buttons
- **Detailed Information**: Breed, gender, age, and description
- **Call-to-Action Section**: Encourages contact for more options

### Adoption (`adoption.html`)
- **Process Steps**: Visual 3-step adoption guide
- **Modern Form**: Clean, user-friendly adoption application
- **Professional Styling**: Consistent with brand design

### Support (`support.html`)
- **Contact Form**: Easy-to-use support request form
- **Contact Information**: Phone, email, WhatsApp, and location
- **FAQ Section**: 6 comprehensive frequently asked questions

## 🎨 Design System

### Color Palette
```css
--primary-orange: #F07010;      /* Primary actions, CTAs */
--secondary-teal: #008BA3;      /* Branding, footer */
--pastel-yellow: #FFF9E6;       /* Breed card backgrounds */
--pastel-pink: #FFE6F0;         /* Breed card backgrounds */
--pastel-blue: #E6F4FF;         /* Breed card backgrounds */
--pastel-mint: #E6FFF0;         /* Breed card backgrounds */
--pastel-lavender: #F0E6FF;     /* Breed card backgrounds */
```

### Typography
- **Primary Font**: Poppins (400, 600, 700, 800)
- **Headings**: Bold, large, high contrast
- **Body**: Clean, highly readable

### Components
- **Buttons**: Rounded, with hover effects
- **Cards**: Elevated with shadows, rounded corners
- **Forms**: Modern inputs with focus states
- **Badges**: Gold, Platinum, Silver tier indicators

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Pets
- `GET /api/pets` - Get all pets (with filtering)
- `GET /api/pets/:id` - Get single pet
- `POST /api/pets` - Create pet (Admin only)
- `PUT /api/pets/:id` - Update pet (Admin only)
- `DELETE /api/pets/:id` - Delete pet (Admin only)

### Adoption
- `POST /api/adoption/request` - Submit adoption request
- `GET /api/adoption/requests` - Get adoption requests (Admin)
- `PUT /api/adoption/requests/:id/status` - Update request status

### Shop
- `GET /api/shop/products` - Get shop products
- `GET /api/shop/products/:id` - Get single product
- `POST /api/shop/products` - Create product (Admin only)

### Payment
- `POST /api/payment/create-intent` - Create payment intent
- `POST /api/payment/confirm` - Confirm payment
- `POST /api/payment/webhook` - Stripe webhook

### Support
- `POST /api/support/tickets` - Submit support ticket
- `GET /api/support/tickets` - Get support tickets (Admin)

## 🗄️ Database Schema

### Tables
- **users** - User accounts and profiles
- **pets** - Pet information and availability
- **adoption_requests** - Adoption applications
- **shop_products** - E-commerce products
- **orders** - Customer orders
- **order_items** - Order line items
- **payments** - Payment transactions
- **support_tickets** - Customer support

## 👤 Default Admin Account

After database initialization:
- **Username**: admin
- **Email**: admin@sharmapetnation.com
- **Password**: admin123

⚠️ **Important**: Change the default password in production!

## 💳 Stripe Setup

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

## 📁 File Structure

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
├── index.html               # Home page (Puppiezo-style)
├── available-pets.html      # Available pets page
├── adoption.html            # Adoption page
├── support.html             # Support page
├── shop.html                # Shop page
├── admin.html               # Admin panel
└── style.css                # Main stylesheet (Puppiezo design system)
```

## 🛠️ Development

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

### Customizing the Design
The design system is built with CSS variables in `style.css`:
- Modify colors in `:root` section
- Adjust spacing, shadows, and border radius
- Customize component styles

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent abuse and DDoS
- **Input Validation**: Comprehensive data validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Cross-origin request security
- **Helmet**: Security headers
- **Password Hashing**: bcrypt for password security

## 📱 Contact Features

### Floating Contact Sidebar
Always-visible sidebar with:
- 📞 **Call Button**: Direct phone call to +91 8882845702
- 💬 **WhatsApp Button**: Instant messaging via WhatsApp
- 📧 **Inquiry Button**: Navigate to support page

### Header Contact Info
- Support phone number
- Email address
- Quick access to support page

## 🎯 Pet Badge System

### Tier Levels
- 🥇 **Gold**: Premium pets with excellent lineage
- 🥈 **Platinum**: Top-tier, rare breed pets
- 🥉 **Silver**: Standard, healthy pets

Each pet card displays:
- Badge in top-right corner
- Breed, gender, and age information
- Description
- Three action buttons (Call, WhatsApp, Adopt/View Details)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support:
- **Email**: info@sharmapetnation.com
- **Phone**: +91 8882845702
- **WhatsApp**: [Chat with us](https://wa.me/918882845702)
- **Website**: Submit a support ticket through the support page

## 🚀 Deployment

### Quick Deployment Guide

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

**Recommended Hosting Platforms:**
- **Railway** - Modern, easy deployment from GitHub
- **Render** - Free tier with no sleep time
- **Heroku** - Classic PaaS with simple Git deployment
- **VPS** - Full control (DigitalOcean, Linode, AWS EC2)

**Pre-Deployment Checklist:**
- [ ] Set environment variables (JWT_SECRET, STRIPE keys, EMAIL credentials)
- [ ] Update CORS origins in `server.js` for production domain
- [ ] Change default admin password
- [ ] Configure production database
- [ ] Set up SSL certificate
- [ ] Test all functionality

**Estimated Monthly Cost:** ₹500-1500 ($6-20)

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
FRONTEND_URL=https://yourdomain.com
```

## 📝 Changelog

### v2.0.0 (December 2025) - Puppiezo-Style Redesign
- 🎨 Complete UI/UX redesign inspired by Puppiezo.com
- 🎬 **Auto-playing hero image slider** with 4 slides (NEW)
- 🧡 New orange (#F07010) and teal (#008BA3) color scheme
- 📱 Added floating contact sidebar (Call, WhatsApp, Inquiry)
- 🏷️ Implemented pet badge system (Gold, Platinum, Silver)
- 🎯 Added multiple CTAs per pet card
- 🎨 Created pastel breed cards with elevated images
- ✨ Integrated Poppins typography
- 📐 Enhanced responsive design
- 🔍 Added search bar to header
- 📊 Improved footer with multi-column layout
- 🔒 Updated CSP configuration for Swiper.js

### v1.0.0 (Initial Release)
- Initial release
- Complete pet adoption platform
- Stripe payment integration
- User authentication system
- Admin panel functionality
- Basic responsive design

## 🙏 Acknowledgments

- Design inspiration from [Puppiezo.com](https://puppiezo.com)
- Google Fonts for Poppins typography
- Stripe for payment processing
- The open-source community

---

**Made with ❤️ for pet lovers in India**

*Bringing joy to families, one paw at a time.*
