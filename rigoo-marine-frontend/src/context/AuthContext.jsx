import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

export const ROLES = {
  CLIENT:     'CLIENT',
  TECHNICIAN: 'TECHNICIAN',
  TEAM_LEAD:  'TEAM_LEAD',
  DELIVERY:   'DELIVERY',
  ADMIN:      'ADMIN',
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
