/**
 * Internal service-to-service routes (not exposed via the public gateway).
 * These routes are accessible only from within the Docker Compose network.
 */
const express = require('express');

const router = express.Router();
const User = require('../models/User');

/**
 * GET /api/v1/internal/users/:id
 * Returns name + phone for a given user ID.
 * Used by appointment-service to resolve patientPhone when not in the booking body.
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: { id: user.id, name: user.name, phone: user.phone, email: user.email },
    });
  } catch (error) {
    console.error('Internal user lookup error:', error);
    res.status(500).json({ success: false, message: 'Internal lookup failed' });
  }
});

module.exports = router;
