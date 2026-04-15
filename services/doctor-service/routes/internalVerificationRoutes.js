const express = require('express');
const VerificationModel = require('../models/VerificationModel');

const router = express.Router();

const internalServiceGuard = (req, res, next) => {
  const expected = process.env.INTERNAL_SERVICE_KEY || 'healthcare-internal-dev';
  const provided = req.headers['x-internal-service-key'];

  if (!provided || provided !== expected) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
};

/**
 * Auth-service calls this before issuing doctor JWT.
 * Approved: full access. Rejected: can sign in to replace documents.
 * Pending / submitted_for_review: no sign-in until a decision.
 */
router.get('/login-eligibility/:doctorId', internalServiceGuard, async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor ID is required' });
    }

    const status = await VerificationModel.getVerificationStatus(doctorId);
    const verificationStatus = status.status;
    const allowed = verificationStatus === 'approved' || verificationStatus === 'rejected';

    let message = 'OK';
    if (!allowed) {
      if (verificationStatus === 'submitted_for_review') {
        message = 'Your doctor account is awaiting admin verification. You will be able to sign in after approval.';
      } else {
        message =
          'Your doctor verification is not complete yet. Finish registration and submit your documents, then wait for admin approval.';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        allowed,
        verificationStatus,
        message,
      },
    });
  } catch (error) {
    console.error('[internal] login-eligibility error:', error);
    res.status(500).json({ success: false, message: error.message || 'Eligibility check failed' });
  }
});

module.exports = router;
