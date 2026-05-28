export function defaultPathForRole(role) {
  if (role === 'ADMIN')       return '/admin';
  if (role === 'TECHNICIAN')  return '/technician';
  if (role === 'TEAM_LEAD')   return '/team-lead';
  if (role === 'DELIVERY')    return '/delivery';
  if (role === 'CLIENT') return '/';
  return '/dashboard';
}
