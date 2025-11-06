const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './database/pets.db';

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          address TEXT,
          role VARCHAR(20) DEFAULT 'user',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Pets table
      db.run(`
        CREATE TABLE IF NOT EXISTS pets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(50) NOT NULL,
          breed VARCHAR(100) NOT NULL,
          species VARCHAR(20) NOT NULL,
          gender VARCHAR(10) NOT NULL,
          age_weeks INTEGER NOT NULL,
          description TEXT,
          price DECIMAL(10,2),
          image_url VARCHAR(255),
          is_available BOOLEAN DEFAULT 1,
          is_featured BOOLEAN DEFAULT 0,
          vaccination_status VARCHAR(50),
          health_certificate VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Adoption requests table
      db.run(`
        CREATE TABLE IF NOT EXISTS adoption_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          pet_id INTEGER NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          admin_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (pet_id) REFERENCES pets (id)
        )
      `);

      // Shop products table
      db.run(`
        CREATE TABLE IF NOT EXISTS shop_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          category VARCHAR(50) NOT NULL,
          image_url VARCHAR(255),
          stock_quantity INTEGER DEFAULT 0,
          is_available BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          order_number VARCHAR(50) UNIQUE NOT NULL,
          total_amount DECIMAL(10,2) NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          payment_status VARCHAR(20) DEFAULT 'pending',
          shipping_address TEXT NOT NULL,
          billing_address TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Order items table
      db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          item_type VARCHAR(20) NOT NULL, -- 'pet' or 'product'
          item_id INTEGER NOT NULL,
          quantity INTEGER DEFAULT 1,
          price DECIMAL(10,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders (id)
        )
      `);

      // Payments table
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          stripe_payment_intent_id VARCHAR(255),
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(3) DEFAULT 'INR',
          status VARCHAR(20) DEFAULT 'pending',
          payment_method VARCHAR(50),
          transaction_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders (id)
        )
      `);

      // Support tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) NOT NULL,
          phone VARCHAR(20),
          subject VARCHAR(200),
          message TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'open',
          priority VARCHAR(10) DEFAULT 'medium',
          admin_response TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Insert default admin user
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@sharmapetnation.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      
      bcrypt.hash(adminPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error('Error hashing admin password:', err);
          return;
        }

        db.run(`
          INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role)
          VALUES (?, ?, ?, ?, ?)
        `, ['admin', adminEmail, hashedPassword, 'Administrator', 'admin']);
      });

      // Insert sample pets
      db.run(`
        INSERT OR IGNORE INTO pets (name, breed, species, gender, age_weeks, description, price, image_url, vaccination_status)
        VALUES 
        ('Birchy', 'Persian Cat', 'Cat', 'Female', 12, 'Beautiful Persian cat with soft fur and gentle nature. Perfect for families.', 25000, 'PersianCat.jpeg', 'Vaccinated'),
        ('Charlie', 'Toy Pom', 'Dog', 'Male', 12, 'Adorable Toy Pomeranian, playful and energetic. Great companion.', 35000, 'Toy Pom.jpg', 'Vaccinated'),
        ('Harry', 'Poodle', 'Dog', 'Male', 8, 'Smart and friendly Poodle puppy. Easy to train and very loyal.', 40000, 'Poodle.jpg', 'Vaccinated'),
        ('Goldie', 'Golden Retriever', 'Dog', 'Female', 10, 'Loving Golden Retriever with golden coat. Perfect family dog.', 45000, 'GoldenRetriever.jpeg', 'Vaccinated')
      `);

      // Insert sample shop products
      db.run(`
        INSERT OR IGNORE INTO shop_products (name, description, price, category, image_url, stock_quantity)
        VALUES 
        ('Chewable Dog Toy', 'Durable rubber toy for endless fun and entertainment', 599, 'Toys', 'https://i.imgur.com/6L0fQxw.jpeg', 50),
        ('Premium Cat Food', 'Nutritious and vet-approved dry food for all life stages', 1299, 'Food', 'https://i.imgur.com/ptVqErD.jpeg', 30),
        ('Organic Pet Shampoo', 'Keep your pet''s coat clean and shiny with natural ingredients', 799, 'Grooming', 'https://i.imgur.com/MKVnZAC.jpeg', 25)
      `);

      console.log('✅ Database tables created successfully');
      resolve();
    });
  });
}

// Get database connection
function getDatabase() {
  return db;
}

module.exports = {
  initializeDatabase,
  getDatabase
};
