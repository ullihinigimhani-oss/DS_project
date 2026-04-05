/**
 * Authentication Middleware
 * Verifies JWT tokens and user permissions
 */

const { verifyAccessToken } = require('../services/jwtService');
const User = require('../models/User');

/**
 * Middleware to verify JWT token
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Middleware to check if user is authorized for specific roles
 */
const authorizeRole = (roles = []) => (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions',
      });
    }

    next();
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Unauthorized',
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user is admin
 */
const adminMiddleware = (req, res, next) => authorizeRole(['admin'])(req, res, next);

/**
 * Middleware to check if user is doctor
 */
const doctorMiddleware = (req, res, next) => authorizeRole(['doctor'])(req, res, next);

/**
 * Middleware to check if user is patient
 */
const patientMiddleware = (req, res, next) => authorizeRole(['patient'])(req, res, next);

const verifyToken = authMiddleware;

module.exports = {
  authMiddleware,
  verifyToken,
  authorizeRole,
  adminMiddleware,
  doctorMiddleware,
  patientMiddleware,
};
