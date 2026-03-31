import { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, TextField,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';

const roleOptions = ['CLIENT', 'TECHNICIAN', 'ADMIN'];
const statusOptions = ['ACTIVE', 'INACTIVE'];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with API call
    // fetch('/api/admin/users')
    setUsers([
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'CLIENT', status: 'ACTIVE', joinedDate: '2026-01-15' },
      { id: 2, name: 'Mike Davis', email: 'mike@example.com', role: 'TECHNICIAN', status: 'ACTIVE', joinedDate: '2025-11-20' },
      { id: 3, name: 'Admin User', email: 'admin@rigoomarine.com', role: 'ADMIN', status: 'ACTIVE', joinedDate: '2025-01-01' },
    ]);
    setLoading(false);
  }, []);

  const filteredUsers = filterRole === 'ALL'
    ? users
    : users.filter(u => u.role === filterRole);

  const handleRoleUpdate = async (userId, newRole) => {
    // TODO: Call API to update role
    // PUT /api/admin/users/:id/role
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
  };

  const handleStatusToggle = async (userId, newStatus) => {
    // TODO: Call API to toggle status
    // PUT /api/admin/users/:id/status
    setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    setSelectedUser(null);
  };

  const roleColors = {
    CLIENT: 'default',
    TECHNICIAN: 'info',
    ADMIN: 'error',
  };

  if (loading) {
    return <Typography>Loading users...</Typography>;
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">User Management</Typography>
        <TextField
          select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="ALL">All Roles</MenuItem>
          {roleOptions.map((role) => (
            <MenuItem key={role} value={role}>
              {role}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={roleColors[user.role]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        color={user.status === 'ACTIVE' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.joinedDate}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedUser(user)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Manage User Dialog */}
      <Dialog open={!!selectedUser} onClose={() => setSelectedUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Manage User: {selectedUser?.name}</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" paragraph>
                <strong>Email:</strong> {selectedUser.email}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Current Role:</strong> {selectedUser.role}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Status:</strong> {selectedUser.status}
              </Typography>

              <Typography variant="subtitle2" sx={{ mt: 3 }}>Change Role</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {roleOptions.map((role) => (
                  <Button
                    key={role}
                    size="small"
                    variant={selectedUser.role === role ? 'contained' : 'outlined'}
                    onClick={() => handleRoleUpdate(selectedUser.id, role)}
                  >
                    {role}
                  </Button>
                ))}
              </Box>

              <Typography variant="subtitle2" sx={{ mt: 3 }}>Status</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    size="small"
                    variant={selectedUser.status === status ? 'contained' : 'outlined'}
                    onClick={() => handleStatusToggle(selectedUser.id, status)}
                  >
                    {status}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedUser(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
