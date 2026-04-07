const { generateTokens, verifyAccessToken, verifyRefreshToken } = require('../services/jwtService');

describe('JWT Service', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    user_type: 'patient'
  };

  test('should generate access and refresh tokens', () => {
    const tokens = generateTokens(mockUser);
    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
  });

  test('should successfully verify a valid access token', () => {
    const { accessToken } = generateTokens(mockUser);
    const decoded = verifyAccessToken(accessToken);
    
    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(mockUser.id);
    expect(decoded.email).toBe(mockUser.email);
    expect(decoded.user_type).toBe(mockUser.user_type);
  });

  test('should successfully verify a valid refresh token', () => {
    const { refreshToken } = generateTokens(mockUser);
    const decoded = verifyRefreshToken(refreshToken);
    
    expect(decoded).not.toBeNull();
    expect(decoded.id).toBe(mockUser.id);
  });

  test('should return null for invalid tokens', () => {
    const decodedAccess = verifyAccessToken('invalid.token.string');
    const decodedRefresh = verifyRefreshToken('invalid.token.string');
    
    expect(decodedAccess).toBeNull();
    expect(decodedRefresh).toBeNull();
  });
});
