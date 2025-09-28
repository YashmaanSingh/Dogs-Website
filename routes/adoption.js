const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database/init');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Submit adoption request
// @route   POST /api/adoption/request
// @access  Public (but better with authentication)
router.post('/request', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('preferredPet').trim().notEmpty().withMessage('Preferred pet is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
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

    const { name, email, phone, preferredPet, message, userId } = req.body;

    const db = getDatabase();

    // Check if the preferred pet exists and is available
    db.get(
      'SELECT id, name, is_available FROM pets WHERE name = ? AND is_available = 1',
      [preferredPet],
      (err, pet) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!pet) {
          return res.status(400).json({
            success: false,
            message: 'Selected pet is not available for adoption'
          });
        }

        // Check if user already has a pending request for this pet
        const checkQuery = userId 
          ? 'SELECT id FROM adoption_requests WHERE user_id = ? AND pet_id = ? AND status = "pending"'
          : 'SELECT id FROM adoption_requests WHERE email = ? AND pet_id = ? AND status = "pending"';
        
        const checkParams = userId ? [userId, pet.id] : [email, pet.id];

        db.get(checkQuery, checkParams, (err, existingRequest) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error'
            });
          }

          if (existingRequest) {
            return res.status(400).json({
              success: false,
              message: 'You already have a pending adoption request for this pet'
            });
          }

          // Create adoption request
          const insertQuery = userId
            ? `INSERT INTO adoption_requests (user_id, pet_id, message, name, email, phone)
               VALUES (?, ?, ?, ?, ?, ?)`
            : `INSERT INTO adoption_requests (pet_id, message, name, email, phone)
               VALUES (?, ?, ?, ?, ?)`;

          const insertParams = userId 
            ? [userId, pet.id, message, name, email, phone]
            : [pet.id, message, name, email, phone];

          db.run(insertQuery, insertParams, function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Error submitting adoption request'
              });
            }

            res.status(201).json({
              success: true,
              message: 'Adoption request submitted successfully',
              data: {
                requestId: this.lastID,
                petName: pet.name
              }
            });
          });
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

// @desc    Get adoption requests (Admin only)
// @route   GET /api/adoption/requests
// @access  Private (Admin)
router.get('/requests', [
  protect,
  authorize('admin'),
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status;

    const db = getDatabase();

    let whereClause = '';
    let params = [];

    if (status) {
      whereClause = 'WHERE ar.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM adoption_requests ar
      ${whereClause}
    `;

    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Get adoption requests with pet details
      const requestsQuery = `
        SELECT ar.id, ar.user_id, ar.pet_id, ar.message, ar.status, ar.admin_notes,
               ar.created_at, ar.updated_at,
               p.name as pet_name, p.breed, p.species, p.gender, p.age_weeks, p.price, p.image_url,
               u.username, u.email as user_email, u.full_name, u.phone as user_phone,
               ar.name as requester_name, ar.email as requester_email, ar.phone as requester_phone
        FROM adoption_requests ar
        JOIN pets p ON ar.pet_id = p.id
        LEFT JOIN users u ON ar.user_id = u.id
        ${whereClause}
        ORDER BY ar.created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(requestsQuery, [...params, limit, offset], (err, requests) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: requests,
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

// @desc    Update adoption request status
// @route   PUT /api/adoption/requests/:id/status
// @access  Private (Admin)
router.put('/requests/:id/status', [
  protect,
  authorize('admin'),
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  body('adminNotes').optional().trim()
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

    const requestId = req.params.id;
    const { status, adminNotes } = req.body;

    if (!requestId || isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID'
      });
    }

    const db = getDatabase();

    // Check if request exists
    db.get(
      'SELECT id, pet_id, status FROM adoption_requests WHERE id = ?',
      [requestId],
      (err, request) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!request) {
          return res.status(404).json({
            success: false,
            message: 'Adoption request not found'
          });
        }

        if (request.status !== 'pending' && status !== request.status) {
          return res.status(400).json({
            success: false,
            message: 'Cannot change status of already processed request'
          });
        }

        // Update request status
        db.run(
          `UPDATE adoption_requests 
           SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [status, adminNotes, requestId],
          function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Error updating request status'
              });
            }

            // If approved, mark pet as unavailable
            if (status === 'approved') {
              db.run(
                'UPDATE pets SET is_available = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [request.pet_id],
                (err) => {
                  if (err) {
                    console.error('Error updating pet availability:', err);
                  }
                }
              );
            }

            res.json({
              success: true,
              message: `Adoption request ${status} successfully`
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user's adoption requests
// @route   GET /api/adoption/my-requests
// @access  Private
router.get('/my-requests', protect, (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDatabase();

    db.all(
      `SELECT ar.id, ar.status, ar.message, ar.admin_notes, ar.created_at, ar.updated_at,
              p.name as pet_name, p.breed, p.species, p.gender, p.age_weeks, p.price, p.image_url
       FROM adoption_requests ar
       JOIN pets p ON ar.pet_id = p.id
       WHERE ar.user_id = ?
       ORDER BY ar.created_at DESC`,
      [userId],
      (err, requests) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: requests
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

// @desc    Get adoption statistics (Admin only)
// @route   GET /api/adoption/stats
// @access  Private (Admin)
router.get('/stats', [protect, authorize('admin')], (req, res) => {
  try {
    const db = getDatabase();

    db.get(
      `SELECT 
        COUNT(*) as total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_requests,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_requests,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_requests
       FROM adoption_requests`,
      (err, stats) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: stats
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
