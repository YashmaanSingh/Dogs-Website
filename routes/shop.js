const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database/init');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadProductImage, handleUploadError, deleteFile, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all shop products with filtering and pagination
// @route   GET /api/shop/products
// @access  Public
router.get('/products', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('category').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('available').optional().isBoolean().withMessage('Available must be true or false'),
  query('search').optional().trim()
], optionalAuth, (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const { category, minPrice, maxPrice, available, search } = req.query;

    let whereConditions = [];
    let params = [];

    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      whereConditions.push('price >= ?');
      params.push(minPrice);
    }

    if (maxPrice) {
      whereConditions.push('price <= ?');
      params.push(maxPrice);
    }

    if (available !== undefined) {
      whereConditions.push('is_available = ?');
      params.push(available === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const db = getDatabase();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM shop_products ${whereClause}`;
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Get products
      const productsQuery = `
        SELECT id, name, description, price, category, image_url, 
               stock_quantity, is_available, created_at
        FROM shop_products ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(productsQuery, [...params, limit, offset], (err, products) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: products,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single product
// @route   GET /api/shop/products/:id
// @access  Public
router.get('/products/:id', optionalAuth, (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const db = getDatabase();
    
    db.get(
      `SELECT id, name, description, price, category, image_url, 
              stock_quantity, is_available, created_at
       FROM shop_products WHERE id = ?`,
      [productId],
      (err, product) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        res.json({
          success: true,
          data: product
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Upload product image
// @route   POST /api/shop/upload-image
// @access  Private (Admin only)
router.post('/upload-image', [
  protect,
  authorize('admin')
], uploadProductImage, handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = getFileUrl(req.file.filename, 'products');
    
    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        imageUrl: imageUrl,
        originalName: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
});

// @desc    Delete product image
// @route   DELETE /api/shop/image/:filename
// @access  Private (Admin only)
router.delete('/image/:filename', [
  protect,
  authorize('admin')
], async (req, res) => {
  try {
    const filename = req.params.filename;
    const path = require('path');
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'products', filename);

    await deleteFile(filePath);

    // Update database to remove image reference
    const db = getDatabase();
    db.run(
      'UPDATE shop_products SET image_url = NULL WHERE image_url LIKE ?',
      [`%/uploads/products/${filename}`],
      (err) => {
        if (err) {
          console.error('Error updating database:', err);
        }
      }
    );

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
});

// @desc    Create new product
// @route   POST /api/shop/products
// @access  Private (Admin only)
router.post('/products', [
  protect,
  authorize('admin'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').trim().isLength({ min: 2 }).withMessage('Category must be at least 2 characters'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('isAvailable').optional().isBoolean()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name, description, price, category, imageUrl, 
      stockQuantity, isAvailable
    } = req.body;

    const db = getDatabase();
    
    db.run(
      `INSERT INTO shop_products (name, description, price, category, image_url, 
                                 stock_quantity, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category, imageUrl, 
       stockQuantity || 0, isAvailable !== false ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error creating product'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Product created successfully',
          data: { id: this.lastID }
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update product
// @route   PUT /api/shop/products/:id
// @access  Private (Admin only)
router.put('/products/:id', [
  protect,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('category').optional().trim().isLength({ min: 2 }).withMessage('Category must be at least 2 characters'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid'),
  body('stockQuantity').optional().isInt({ min: 0 }).withMessage('Stock quantity must be a non-negative integer'),
  body('isAvailable').optional().isBoolean()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const productId = req.params.id;
    const updates = req.body;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const db = getDatabase();

    // Check if product exists
    db.get('SELECT id FROM shop_products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const params = [];

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          switch (key) {
            case 'name':
              updateFields.push('name = ?');
              params.push(updates[key]);
              break;
            case 'description':
              updateFields.push('description = ?');
              params.push(updates[key]);
              break;
            case 'price':
              updateFields.push('price = ?');
              params.push(updates[key]);
              break;
            case 'category':
              updateFields.push('category = ?');
              params.push(updates[key]);
              break;
            case 'imageUrl':
              updateFields.push('image_url = ?');
              params.push(updates[key]);
              break;
            case 'stockQuantity':
              updateFields.push('stock_quantity = ?');
              params.push(updates[key]);
              break;
            case 'isAvailable':
              updateFields.push('is_available = ?');
              params.push(updates[key] ? 1 : 0);
              break;
          }
        }
      });

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(productId);

      const updateQuery = `UPDATE shop_products SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(updateQuery, params, function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error updating product'
          });
        }

        res.json({
          success: true,
          message: 'Product updated successfully'
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete product
// @route   DELETE /api/shop/products/:id
// @access  Private (Admin only)
router.delete('/products/:id', [protect, authorize('admin')], (req, res) => {
  try {
    const productId = req.params.id;

    if (!productId || isNaN(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID'
      });
    }

    const db = getDatabase();
    
    db.get('SELECT id FROM shop_products WHERE id = ?', [productId], (err, product) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      db.run('DELETE FROM shop_products WHERE id = ?', [productId], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error deleting product'
          });
        }

        res.json({
          success: true,
          message: 'Product deleted successfully'
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get product categories
// @route   GET /api/shop/categories
// @access  Public
router.get('/categories', (req, res) => {
  try {
    const db = getDatabase();
    
    db.all(
      `SELECT category, COUNT(*) as product_count
       FROM shop_products 
       WHERE is_available = 1
       GROUP BY category
       ORDER BY category`,
      (err, categories) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: categories
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get featured products
// @route   GET /api/shop/featured
// @access  Public
router.get('/featured', optionalAuth, (req, res) => {
  try {
    const db = getDatabase();
    
    db.all(
      `SELECT id, name, description, price, category, image_url, stock_quantity
       FROM shop_products 
       WHERE is_available = 1 AND stock_quantity > 0
       ORDER BY created_at DESC
       LIMIT 6`,
      (err, products) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: products
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
