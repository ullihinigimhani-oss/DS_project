const internalServiceMiddleware = (req, res, next) => {
  const incomingKey = req.headers['x-internal-service-key'];
  const expectedKey = process.env.INTERNAL_SERVICE_KEY || 'healthcare-internal-dev';

  if (!incomingKey || incomingKey !== expectedKey) {
    return res.status(403).json({
      success: false,
      message: 'Invalid internal service key',
    });
  }

  return next();
};

module.exports = {
  internalServiceMiddleware,
};
