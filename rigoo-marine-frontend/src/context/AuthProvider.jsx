import { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { authApi } from '../services/api';
import { AuthContext, ROLES } from './AuthContext';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const expiresAt = localStorage.getItem('tokenExpiresAt');

    if (token && storedUser) {
      const expiry = new Date(expiresAt);
      if (expiry > new Date()) {
        setUser(JSON.parse(storedUser));
      } else {
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
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (expiresAt) localStorage.setItem('tokenExpiresAt', expiresAt);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const loginWithOtp = useCallback(async (phone, code) => {
    const response = await authApi.verifyOtp(phone, code);
    const { user: userData, token, refreshToken, expiresAt } = response;
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (expiresAt) localStorage.setItem('tokenExpiresAt', expiresAt);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
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
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (expiresAt) localStorage.setItem('tokenExpiresAt', expiresAt);
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await authApi.refreshToken();
      const { token, refreshToken: newRefreshToken, expiresAt } = response;
      localStorage.setItem('token', token);
      if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
      if (expiresAt) localStorage.setItem('tokenExpiresAt', expiresAt);
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

  const hasRole = useCallback((roles) => {
    if (!user?.role) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return roleList.includes(user.role);
  }, [user]);

  // Stable derived booleans — no extra closure per role, computed once per user change.
  const role         = user?.role ?? null;
  const isAdmin      = useCallback(() => role === ROLES.ADMIN,      [role]);
  const isTechnician = useCallback(() => role === ROLES.TECHNICIAN, [role]);
  const isTeamLead   = useCallback(() => role === ROLES.TEAM_LEAD,  [role]);
  const isDelivery   = useCallback(() => role === ROLES.DELIVERY,   [role]);
  const isClient     = useCallback(() => role === ROLES.CLIENT,     [role]);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: !!user,
    role,
    login,
    loginWithOtp,
    logout,
    register,
    refreshToken,
    updateProfile,
    hasRole,
    isAdmin,
    isTechnician,
    isTeamLead,
    isDelivery,
    isClient,
    ROLES,
  }), [user, role, loading, login, loginWithOtp, logout, register, refreshToken, updateProfile, hasRole, isAdmin, isTechnician, isTeamLead, isDelivery, isClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = { children: PropTypes.node.isRequired };
