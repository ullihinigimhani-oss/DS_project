const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET;
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || process.env.REFRESH_TOKEN_EXPIRY || '7d';

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
  const accessToken = generateAccessToken(userId, email, userType);
  const refreshToken = generateRefreshToken(userId, email);
  return { accessToken, refreshToken };
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
