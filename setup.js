#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🐾 Sharma\'s Pet Nation - Setup Script');
console.log('=====================================\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

if (majorVersion < 16) {
    console.error('❌ Node.js version 16 or higher is required.');
    console.error(`   Current version: ${nodeVersion}`);
    console.error('   Please update Node.js from https://nodejs.org/');
    process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Check if package.json exists
if (!fs.existsSync('package.json')) {
    console.error('❌ package.json not found. Please run this script from the project root directory.');
    process.exit(1);
}

console.log('✅ Project structure verified');

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies');
    console.error('   Please run: npm install');
    process.exit(1);
}

// Create .env file if it doesn't exist
if (!fs.existsSync('.env')) {
    console.log('\n⚙️  Creating .env file...');
    try {
        const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./database/pets.db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Date.now()}
JWT_EXPIRES_IN=24h

# Stripe Payment Gateway (Get these from https://stripe.com)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Sharma's Pet Nation <noreply@sharmapetnation.com>

# Admin Configuration
ADMIN_EMAIL=admin@sharmapetnation.com
ADMIN_PASSWORD=admin123

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
`;
        
        fs.writeFileSync('.env', envContent);
        console.log('✅ .env file created');
        console.log('   ⚠️  Please update the Stripe keys in .env file');
    } catch (error) {
        console.error('❌ Failed to create .env file');
        console.error('   Please copy env.example to .env and configure it');
    }
} else {
    console.log('✅ .env file already exists');
}

// Create necessary directories
console.log('\n📁 Creating directories...');
const directories = ['database', 'uploads', 'js'];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    } else {
        console.log(`✅ Directory exists: ${dir}`);
    }
});

// Initialize database
console.log('\n🗄️  Initializing database...');
try {
    // Import and run database initialization
    const { initializeDatabase } = require('./database/init');
    initializeDatabase().then(() => {
        console.log('✅ Database initialized successfully');
        console.log('   📊 Sample data loaded');
        
        // Show completion message
        console.log('\n🎉 Setup completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Update Stripe API keys in .env file');
        console.log('   2. Run: npm run dev');
        console.log('   3. Open: http://localhost:5000');
        console.log('\n🔑 Default admin credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');
        console.log('\n📚 For more information, see README.md');
    }).catch(error => {
        console.error('❌ Failed to initialize database:', error.message);
        console.log('   Please run: npm run init-db');
    });
} catch (error) {
    console.error('❌ Failed to initialize database');
    console.log('   Please run: npm run init-db');
}

// Create gitignore if it doesn't exist
if (!fs.existsSync('.gitignore')) {
    console.log('\n📝 Creating .gitignore...');
    const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# Uploads
uploads/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
`;
    
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✅ .gitignore created');
}
