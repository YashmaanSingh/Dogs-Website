const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const db = getDatabase();
      db.get(
        'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
        [decoded.id],
        (err, user) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error'
            });
          }

          if (!user || !user.is_active) {
            return res.status(401).json({
              success: false,
              message: 'User not found or inactive'
            });
          }

          req.user = user;
          next();
        }
      );
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Optional auth - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const db = getDatabase();
        db.get(
          'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
          [decoded.id],
          (err, user) => {
            if (!err && user && user.is_active) {
              req.user = user;
            }
            next();
          }
        );
      } catch (error) {
        next();
      }
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

module.exports = { protect, authorize, optionalAuth };
