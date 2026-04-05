const express = require('express');

const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify token
 * @access  Private
 */
router.get('/verify', authController.verifyToken);

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile (name and phone only, email cannot be updated)
 * @access  Private
 */
router.put('/update-profile', authController.updateProfile);

module.exports = router;
