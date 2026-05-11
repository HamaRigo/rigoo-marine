import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

export const AuthContext = createContext(null);

const ROLES = {
  CLIENT: 'CLIENT',
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for stored token and user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const expiresAt = localStorage.getItem('tokenExpiresAt');

    if (token && storedUser) {
      const expiry = new Date(expiresAt);
      const now = new Date();

      // Check if token is expired
      if (expiry > now) {
        setUser(JSON.parse(storedUser));
      } else {
        // Token expired, clear storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiresAt');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    const { user: userData, token, refreshToken, expiresAt } = response;

    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem('tokenExpiresAt', expiresAt);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  /**
   * SMS-OTP variant of login. Backend's /otp/verify returns the same shape as
   * /login, so persistence and return value are identical — callers don't need
   * to branch on which method was used.
   */
  const loginWithOtp = useCallback(async (phone, code) => {
    const response = await authApi.verifyOtp(phone, code);
    const { user: userData, token, refreshToken, expiresAt } = response;

    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem('tokenExpiresAt', expiresAt);
    }
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  }, []);

  const logout = useCallback(async () => {
    // Try server-side revocation first so the JWT is blacklisted at the gateway
    // before we drop our local copy. If the API call fails we still clear local
    // state — the user expects logout to be terminal client-side. Worst case
    // the token remains valid until its exp claim and the user's own pwdIat
    // cutoff bounds the damage from a leaked token.
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('logout: server-side revocation failed, clearing local state anyway', err);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiresAt');
    setUser(null);
  }, []);

  const register = useCallback(async (userData) => {
    const response = await authApi.register(userData);
    const { user: newUser, token, refreshToken, expiresAt } = response;

    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    if (expiresAt) {
      localStorage.setItem('tokenExpiresAt', expiresAt);
    }
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);

    return newUser;
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.refreshToken();
      const { token, refreshToken: newRefreshToken, expiresAt } = response;

      localStorage.setItem('token', token);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      if (expiresAt) {
        localStorage.setItem('tokenExpiresAt', expiresAt);
      }

      return token;
    } catch (error) {
      logout();
      throw error;
    }
  }, [logout]);

  const updateProfile = useCallback(async (profileData) => {
    const response = await authApi.updateProfile(profileData);
    const { user: updatedUser } = response;

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    return updatedUser;
  }, []);

  // Role checking helpers
  const hasRole = useCallback((roles) => {
    if (!user?.role) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  const isAdmin = useCallback(() => hasRole(ROLES.ADMIN), [hasRole]);
  const isTechnician = useCallback(() => hasRole(ROLES.TECHNICIAN), [hasRole]);
  const isClient = useCallback(() => hasRole(ROLES.CLIENT), [hasRole]);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    role: user?.role,
    login,
    loginWithOtp,
    logout,
    register,
    refreshToken,
    updateProfile,
    hasRole,
    isAdmin,
    isTechnician,
    isClient,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { ROLES };
