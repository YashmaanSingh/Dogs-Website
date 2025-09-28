const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { getDatabase } = require('../database/init');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// @desc    Submit support ticket
// @route   POST /api/support/tickets
// @access  Public (but better with authentication)
router.post('/tickets', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('subject').optional().trim().isLength({ max: 200 }).withMessage('Subject must be less than 200 characters'),
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

    const { name, email, phone, subject, message, userId } = req.body;

    const db = getDatabase();
    
    db.run(
      `INSERT INTO support_tickets (user_id, name, email, phone, subject, message, priority)
       VALUES (?, ?, ?, ?, ?, ?, 'medium')`,
      [userId || null, name, email, phone, subject, message],
      function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error submitting support ticket'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Support ticket submitted successfully',
          data: {
            ticketId: this.lastID
          }
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

// @desc    Get support tickets (Admin only)
// @route   GET /api/support/tickets
// @access  Private (Admin)
router.get('/tickets', [
  protect,
  authorize('admin'),
  query('status').optional().isIn(['open', 'closed', 'pending']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
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

    const { status, priority } = req.query;

    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    if (priority) {
      whereConditions.push('priority = ?');
      params.push(priority);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const db = getDatabase();

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM support_tickets ${whereClause}`;
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      // Get support tickets
      const ticketsQuery = `
        SELECT st.id, st.user_id, st.name, st.email, st.phone, st.subject, st.message,
               st.status, st.priority, st.admin_response, st.created_at, st.updated_at,
               u.username, u.full_name as user_full_name
        FROM support_tickets st
        LEFT JOIN users u ON st.user_id = u.id
        ${whereClause}
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          st.created_at DESC
        LIMIT ? OFFSET ?
      `;

      db.all(ticketsQuery, [...params, limit, offset], (err, tickets) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: tickets,
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

// @desc    Get single support ticket
// @route   GET /api/support/tickets/:id
// @access  Private (Admin or ticket owner)
router.get('/tickets/:id', protect, (req, res) => {
  try {
    const ticketId = req.params.id;

    if (!ticketId || isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const db = getDatabase();
    
    db.get(
      `SELECT st.id, st.user_id, st.name, st.email, st.phone, st.subject, st.message,
              st.status, st.priority, st.admin_response, st.created_at, st.updated_at,
              u.username, u.full_name as user_full_name
       FROM support_tickets st
       LEFT JOIN users u ON st.user_id = u.id
       WHERE st.id = ?`,
      [ticketId],
      (err, ticket) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        if (!ticket) {
          return res.status(404).json({
            success: false,
            message: 'Support ticket not found'
          });
        }

        // Allow users to view their own tickets or admins to view any ticket
        if (ticket.user_id && req.user.id !== ticket.user_id && req.user.role !== 'admin') {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view this ticket'
          });
        }

        res.json({
          success: true,
          data: ticket
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

// @desc    Update support ticket (Admin only)
// @route   PUT /api/support/tickets/:id
// @access  Private (Admin)
router.put('/tickets/:id', [
  protect,
  authorize('admin'),
  body('status').optional().isIn(['open', 'closed', 'pending']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
  body('adminResponse').optional().trim()
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

    const ticketId = req.params.id;
    const { status, priority, adminResponse } = req.body;

    if (!ticketId || isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket ID'
      });
    }

    const db = getDatabase();

    // Check if ticket exists
    db.get('SELECT id FROM support_tickets WHERE id = ?', [ticketId], (err, ticket) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: 'Support ticket not found'
        });
      }

      // Build dynamic update query
      const updateFields = [];
      const params = [];

      if (status !== undefined) {
        updateFields.push('status = ?');
        params.push(status);
      }

      if (priority !== undefined) {
        updateFields.push('priority = ?');
        params.push(priority);
      }

      if (adminResponse !== undefined) {
        updateFields.push('admin_response = ?');
        params.push(adminResponse);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update'
        });
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(ticketId);

      const updateQuery = `UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`;

      db.run(updateQuery, params, function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Error updating support ticket'
          });
        }

        res.json({
          success: true,
          message: 'Support ticket updated successfully'
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

// @desc    Get user's support tickets
// @route   GET /api/support/my-tickets
// @access  Private
router.get('/my-tickets', protect, (req, res) => {
  try {
    const userId = req.user.id;
    const db = getDatabase();

    db.all(
      `SELECT id, subject, message, status, priority, admin_response, created_at, updated_at
       FROM support_tickets
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId],
      (err, tickets) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error'
          });
        }

        res.json({
          success: true,
          data: tickets
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

// @desc    Get support statistics (Admin only)
// @route   GET /api/support/stats
// @access  Private (Admin)
router.get('/stats', [protect, authorize('admin')], (req, res) => {
  try {
    const db = getDatabase();

    db.get(
      `SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_tickets,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_tickets,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_tickets,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority_tickets,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium_priority_tickets,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low_priority_tickets,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as tickets_today,
        SUM(CASE WHEN DATE(created_at) >= DATE('now', '-7 days') THEN 1 ELSE 0 END) as tickets_this_week
       FROM support_tickets`,
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
