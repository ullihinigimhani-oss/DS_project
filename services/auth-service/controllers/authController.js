const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../services/jwtService');
const { sendAuthEvent } = require('../config/kafka');
const { logAuditEvent } = require('../services/auditLogService');

async function fetchDoctorLoginEligibility(doctorId) {
  const base = (process.env.DOCTOR_SERVICE_URL || 'http://localhost:3003').replace(/\/$/, '');
  const key = process.env.INTERNAL_SERVICE_KEY || 'healthcare-internal-dev';
  const url = `${base}/api/v1/internal/verification/login-eligibility/${encodeURIComponent(doctorId)}`;

  try {
    const response = await fetch(url, {
      headers: { 'x-internal-service-key': key },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        allowed: false,
        message: data.message || 'Unable to confirm doctor verification status.',
      };
    }

    return {
      allowed: Boolean(data.data?.allowed),
      message: data.data?.message,
    };
  } catch (error) {
    console.error('[auth] doctor eligibility fetch failed:', error.message);
    return {
      allowed: false,
      message: 'Unable to reach doctor verification service. Please try again later.',
    };
  }
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const checkEmailAvailability = async (req, res) => {
  try {
    const raw = req.query.email;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email query parameter is required',
      });
    }

    const email = normalizeEmail(raw);
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
      });
    }

    const existing = await User.findByEmail(email);

    return res.status(200).json({
      success: true,
      data: {
        available: !existing,
        existingUserType: existing ? existing.user_type : null,
      },
    });
  } catch (error) {
    console.error('Email availability check error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to check email availability',
      error: error.message,
    });
  }
};

const register = async (req, res) => {
  try {
    const { password, name, phone, userType } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, password, and name',
      });
    }

    if (userType === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created via registration',
      });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      const role = String(existingUser.user_type || 'user').toLowerCase();
      return res.status(409).json({
        success: false,
        message: `This email is already registered as a ${role}. Sign in with that account or use a different email.`,
      });
    }

    const newUser = await User.create({
      email,
      password,
      name,
      phone,
      userType: userType || 'patient',
    });

    const { accessToken, refreshToken } = generateTokens(
      newUser.id,
      newUser.email,
      newUser.user_type,
    );

    await sendAuthEvent('USER_REGISTERED', {
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
      phone: newUser.phone,
      userType: newUser.user_type,
      registeredAt: newUser.created_at,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          phone: newUser.phone,
          userType: newUser.user_type,
        },
        accessToken,
        refreshToken,
      },
    });

    await logAuditEvent(req, {
      action: 'USER_REGISTERED',
      resourceType: 'user',
      resourceId: newUser.id,
      details: {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { password, role } = req.body;
    const email = normalizeEmail(req.body.email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (role && String(role).toLowerCase() !== String(user.user_type).toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'The selected role does not match this account.',
      });
    }

    if (user.user_type === 'doctor') {
      const eligibility = await fetchDoctorLoginEligibility(user.id);
      if (!eligibility.allowed) {
        return res.status(403).json({
          success: false,
          message: eligibility.message || 'Doctor login is not available until your account is verified.',
        });
      }
    }

    const { accessToken, refreshToken } = generateTokens(
      user.id,
      user.email,
      user.user_type,
    );

    await sendAuthEvent('USER_LOGIN', {
      userId: user.id,
      email: user.email,
      loginTime: new Date(),
    });

    const rawLoginIp =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const loginIp = rawLoginIp.startsWith('::ffff:') ? rawLoginIp.slice(7) : rawLoginIp;

    AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.name,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      details: { userType: user.user_type },
      ipAddress: loginIp,
    }).catch((auditError) => console.error('[AuditLog] login log error:', auditError.message));

    await logAuditEvent(req, {
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      details: {
        userId: user.id,
        email: user.email,
        userType: user.user_type,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          userType: user.user_type,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No access token provided',
      });
    }

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required for logout',
      });
    }

    const accessToken = authHeader.substring(7);

    const decodedAccess = verifyAccessToken(accessToken);
    const decodedRefresh = verifyRefreshToken(refreshToken);

    if (decodedAccess.userId !== decodedRefresh.userId) {
      return res.status(401).json({
        success: false,
        message: 'Token mismatch: tokens do not belong to the same user',
      });
    }

    const user = await User.findById(decodedAccess.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    await sendAuthEvent('USER_LOGOUT', {
      userId: user.id,
      email: user.email,
      logoutTime: new Date(),
      accessToken: `${accessToken.substring(0, 20)}...`,
      refreshToken: `${refreshToken.substring(0, 20)}...`,
    });

    const rawLogoutIp =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const logoutIp = rawLogoutIp.startsWith('::ffff:') ? rawLogoutIp.slice(7) : rawLogoutIp;

    AuditLog.create({
      actorId: user.id,
      actorEmail: user.email,
      actorName: user.name,
      action: 'USER_LOGOUT',
      resourceType: 'user',
      resourceId: user.id,
      details: { userType: user.user_type },
      ipAddress: logoutIp,
    }).catch((auditError) => console.error('[AuditLog] logout log error:', auditError.message));

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: {
        userId: user.id,
        email: user.email,
      },
    });

    await logAuditEvent(req, {
      action: 'USER_LOGOUT',
      resourceType: 'user',
      resourceId: user.id,
      details: {
        userId: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(401).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
    });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.user_type === 'doctor') {
      const eligibility = await fetchDoctorLoginEligibility(user.id);
      if (!eligibility.allowed) {
        return res.status(403).json({
          success: false,
          message: eligibility.message || 'Doctor session is not allowed until verification is complete.',
        });
      }
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.user_type,
    );

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token refresh failed',
      error: error.message,
    });
  }
};

const verifyToken = async (req, res) => {
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

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      data: { user },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Token verification failed',
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
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

    const db = require('../config/postgres');
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await db.query(userQuery, [decoded.userId]);
    const userWithPassword = userResult.rows[0];

    if (!userWithPassword) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const { name, phone, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password are required',
      });
    }

    const isPasswordValid = await User.verifyPassword(password, userWithPassword.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.',
      });
    }

    const { birthdate, address, emergency_contact, weight, gender } = req.body;
    const updatedUser = await User.update(decoded.userId, {
      name,
      phone,
      birthdate,
      address,
      emergency_contact,
      weight,
      gender,
    });

    await sendAuthEvent('USER_PROFILE_UPDATED', {
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      birthdate: updatedUser.birthdate,
      address: updatedUser.address,
      emergency_contact: updatedUser.emergency_contact,
      weight: updatedUser.weight,
      gender: updatedUser.gender,
      updatedAt: updatedUser.updated_at,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          phone: updatedUser.phone,
          birthdate: updatedUser.birthdate,
          address: updatedUser.address,
          emergency_contact: updatedUser.emergency_contact,
          weight: updatedUser.weight,
          gender: updatedUser.gender,
          userType: updatedUser.user_type,
        },
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Profile update failed',
      error: error.message,
    });
  }
};

module.exports = {
  checkEmailAvailability,
  register,
  login,
  logout,
  refreshToken,
  verifyToken,
  updateProfile,
};
