/**
 * Auth Middleware for Doctor Service
 * Verifies JWT tokens issued by the Auth Service using the shared JWT_SECRET.
 * Doctors authenticate via auth-service; this middleware validates their tokens locally.
 */

const jwt = require('jsonwebtoken');

/**
 * Verify Bearer JWT token issued by auth-service.
 * Attaches decoded payload { userId, email } to req.user on success.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info (userId, email, userType) to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Require admin role. Must be used after authMiddleware.
 */
const requireAdmin = (req, res, next) => {
  if (req.user?.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }

  next();
};

module.exports = { authMiddleware, requireAdmin };
