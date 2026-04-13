const authServiceCandidates = [
  process.env.AUTH_SERVICE_URL,
  'http://auth-service:3001',
  'http://localhost:3001',
].filter(Boolean);

async function verifyWithAuthService(token) {
  let lastError = null;

  for (const baseUrl of authServiceCandidates) {
    const endpoint = `${baseUrl.replace(/\/$/, '')}/api/auth/verify`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.data?.user) {
        return data.data.user;
      }

      if (response.status === 401) {
        throw new Error(data.message || 'Invalid or expired token');
      }

      lastError = new Error(data.message || `Auth verify failed at ${baseUrl}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to reach auth service');
}

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
    const user = await verifyWithAuthService(token);

    req.user = {
      ...user,
      id: user.id,
      userId: user.id,
      role: user.user_type,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

const authorizeRole = (roles = []) => (req, res, next) => {
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

  return next();
};

const adminMiddleware = authorizeRole(['admin']);

module.exports = {
  authMiddleware,
  authorizeRole,
  adminMiddleware,
};
