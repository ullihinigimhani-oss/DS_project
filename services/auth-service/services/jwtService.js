const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

// Debug: Check environment variables
console.log('JWT_SECRET from env:', process.env.JWT_SECRET ? 'LOADED' : 'MISSING');
console.log('JWT_SECRET value:', process.env.JWT_SECRET);

const JWT_SECRET = process.env.JWT_SECRET || 'SyOudFfvRbmoURg4Mq2N34wq_fallback_secret';
const JWT_EXPIRE = process.env.JWT_EXPIRE || process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'SyOudFfvRbmoURg4Mq2N34wq_refresh_fallback';
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Debug: Check all JWT secrets
console.log('JWT_SECRET:', !!JWT_SECRET);
console.log('REFRESH_TOKEN_SECRET:', !!REFRESH_TOKEN_SECRET);

/**
 * Generate JWT access token
 */
const generateAccessToken = (userId, email, userType) =>
  jwt.sign({ userId, email, userType }, JWT_SECRET, { expiresIn: JWT_EXPIRE });

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId, email) =>
  jwt.sign({ userId, email }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });

/**
 * Generate both tokens
 */
const generateTokens = (userId, email, userType) => {
  try {
    console.log('Generating tokens for user:', userId);
    console.log('JWT_SECRET exists:', !!JWT_SECRET);
    console.log('REFRESH_TOKEN_SECRET exists:', !!REFRESH_TOKEN_SECRET);
    
    const accessToken = generateAccessToken(userId, email, userType);
    console.log('Access token generated successfully');
    
    const refreshToken = generateRefreshToken(userId, email);
    console.log('Refresh token generated successfully');
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Error in generateTokens:', error.message);
    throw error;
  }
};

/**
 * Verify access token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Decode token without verification (for debugging)
 */
const decodeToken = (token) => jwt.decode(token);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
