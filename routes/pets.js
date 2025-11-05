const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database/init');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadPetImage, handleUploadError, deleteFile, getFileUrl } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all pets with filtering and pagination
// @route   GET /api/pets
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('species').optional().isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  query('breed').optional().trim(),
  query('gender').optional().isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('available').optional().isBoolean().withMessage('Available must be true or false'),
  query('featured').optional().isBoolean().withMessage('Featured must be true or false')
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

    const { species, breed, gender, minPrice, maxPrice, available, featured } = req.query;

    let whereConditions = [];
    let params = [];

    if (species) {
      whereConditions.push('species = ?');
      params.push(species);
    }

    if (breed) {
      whereConditions.push('breed LIKE ?');
      params.push(`%${breed}%`);
    }

    if (gender) {
      whereConditions.push('gender = ?');
      params.push(gender);
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

    if (featured !== undefined) {
      whereConditions.push('is_featured = ?');
      params.push(featured === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const db = getDatabase();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM pets ${whereClause}`;
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Get pets
      const petsQuery = `
        SELECT id, name, breed, species, gender, age_weeks, description, price, 
               image_url, is_available, is_featured, vaccination_status, created_at
        FROM pets ${whereClause}
        ORDER BY is_featured DESC, created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(petsQuery, [...params, limit, offset], (err, pets) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: pets,
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

// @desc    Get single pet
// @route   GET /api/pets/:id
// @access  Public
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const petId = req.params.id;

    if (!petId || isNaN(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID'
      });
    }

    const db = getDatabase();
    
    db.get(
      `SELECT id, name, breed, species, gender, age_weeks, description, price, 
              image_url, is_available, is_featured, vaccination_status, 
              health_certificate, created_at
       FROM pets WHERE id = ?`,
      [petId],
      (err, pet) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!pet) {
          return res.status(404).json({
            success: false,
            message: 'Pet not found'
          });
        }

        res.json({
          success: true,
          data: pet
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

// @desc    Upload pet image
// @route   POST /api/pets/upload-image
// @access  Private (Admin only)
router.post('/upload-image', [
  protect,
  authorize('admin')
], uploadPetImage, handleUploadError, (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const imageUrl = getFileUrl(req.file.filename, 'pets');
    
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

// @desc    Delete pet image
// @route   DELETE /api/pets/image/:filename
// @access  Private (Admin only)
router.delete('/image/:filename', [
  protect,
  authorize('admin')
], async (req, res) => {
  try {
    const filename = req.params.filename;
    const path = require('path');
    const filePath = path.join(process.env.UPLOAD_PATH || './uploads', 'pets', filename);

    await deleteFile(filePath);

    // Update database to remove image reference
    const db = getDatabase();
    db.run(
      'UPDATE pets SET image_url = NULL WHERE image_url LIKE ?',
      [`%/uploads/pets/${filename}`],
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

// @desc    Create new pet
// @route   POST /api/pets
// @access  Private (Admin only)
router.post('/', [
  protect,
  authorize('admin'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('breed').trim().isLength({ min: 2 }).withMessage('Breed must be at least 2 characters'),
  body('species').isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  body('gender').isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('ageWeeks').isInt({ min: 1 }).withMessage('Age must be a positive integer'),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid'),
  body('vaccinationStatus').optional().trim(),
  body('healthCertificate').optional().trim(),
  body('isFeatured').optional().isBoolean()
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
      name, breed, species, gender, ageWeeks, description, price,
      imageUrl, vaccinationStatus, healthCertificate, isFeatured
    } = req.body;

    const db = getDatabase();
    
    db.run(
      `INSERT INTO pets (name, breed, species, gender, age_weeks, description, price,
                        image_url, vaccination_status, health_certificate, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, breed, species, gender, ageWeeks, description, price,
       imageUrl, vaccinationStatus, healthCertificate, isFeatured ? 1 : 0],
      function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error creating pet'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Pet created successfully',
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

// @desc    Update pet
// @route   PUT /api/pets/:id
// @access  Private (Admin only)
router.put('/:id', [
  protect,
  authorize('admin'),
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('breed').optional().trim().isLength({ min: 2 }).withMessage('Breed must be at least 2 characters'),
  body('species').optional().isIn(['Dog', 'Cat']).withMessage('Species must be Dog or Cat'),
  body('gender').optional().isIn(['Male', 'Female']).withMessage('Gender must be Male or Female'),
  body('ageWeeks').optional().isInt({ min: 1 }).withMessage('Age must be a positive integer'),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('imageUrl').optional().isURL().withMessage('Image URL must be valid'),
  body('vaccinationStatus').optional().trim(),
  body('healthCertificate').optional().trim(),
  body('isAvailable').optional().isBoolean(),
  body('isFeatured').optional().isBoolean()
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

    const petId = req.params.id;
    const updates = req.body;

    if (!petId || isNaN(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID'
      });
    }

    const db = getDatabase();

    // Check if pet exists
    db.get('SELECT id FROM pets WHERE id = ?', [petId], (err, pet) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!pet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found'
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
            case 'breed':
              updateFields.push('breed = ?');
              params.push(updates[key]);
              break;
            case 'species':
              updateFields.push('species = ?');
              params.push(updates[key]);
              break;
            case 'gender':
              updateFields.push('gender = ?');
              params.push(updates[key]);
              break;
            case 'ageWeeks':
              updateFields.push('age_weeks = ?');
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
            case 'imageUrl':
              updateFields.push('image_url = ?');
              params.push(updates[key]);
              break;
            case 'vaccinationStatus':
              updateFields.push('vaccination_status = ?');
              params.push(updates[key]);
              break;
            case 'healthCertificate':
              updateFields.push('health_certificate = ?');
              params.push(updates[key]);
              break;
            case 'isAvailable':
              updateFields.push('is_available = ?');
              params.push(updates[key] ? 1 : 0);
              break;
            case 'isFeatured':
              updateFields.push('is_featured = ?');
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
      params.push(petId);

      const updateQuery = `UPDATE pets SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(updateQuery, params, function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error updating pet'
          });
        }

        res.json({
          success: true,
          message: 'Pet updated successfully'
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

// @desc    Delete pet
// @route   DELETE /api/pets/:id
// @access  Private (Admin only)
router.delete('/:id', [protect, authorize('admin')], (req, res) => {
  try {
    const petId = req.params.id;

    if (!petId || isNaN(petId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pet ID'
      });
    }

    const db = getDatabase();
    
    db.get('SELECT id FROM pets WHERE id = ?', [petId], (err, pet) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!pet) {
        return res.status(404).json({
          success: false,
          message: 'Pet not found'
        });
      }

      db.run('DELETE FROM pets WHERE id = ?', [petId], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error deleting pet'
          });
        }

        res.json({
          success: true,
          message: 'Pet deleted successfully'
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

// @desc    Get featured pets
// @route   GET /api/pets/featured
// @access  Public
router.get('/featured', optionalAuth, (req, res) => {
  try {
    const db = getDatabase();
    
    db.all(
      `SELECT id, name, breed, species, gender, age_weeks, description, price, 
              image_url, vaccination_status
       FROM pets 
       WHERE is_featured = 1 AND is_available = 1
       ORDER BY created_at DESC
       LIMIT 6`,
      (err, pets) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: pets
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
