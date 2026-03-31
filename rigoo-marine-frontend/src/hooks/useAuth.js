import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to access auth context
 * @returns {Object} Auth context value
 *
 * @example
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Enhanced auth hook with role checking
 * @returns {Object} Auth context with role helpers
 */
export function useAuthWithRoles() {
  const auth = useAuth();

  const hasRole = (roles) => {
    if (!auth.user) return false;
    const userRoles = Array.isArray(roles) ? roles : [roles];
    return userRoles.includes(auth.user.role);
  };

  const isAdmin = () => hasRole('ADMIN');
  const isTechnician = () => hasRole('TECHNICIAN');
  const isClient = () => hasRole('CLIENT');

  return {
    ...auth,
    hasRole,
    isAdmin,
    isTechnician,
    isClient,
  };
}

export default useAuth;
