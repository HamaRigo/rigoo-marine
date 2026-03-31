import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  TextField, IconButton, List, ListItem, ListItemText, Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [notes, setNotes] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [timeSpent, setTimeSpent] = useState('');

  useEffect(() => {
    // TODO: Replace with API call
    // fetch(`/api/technician/orders/${id}`)
    setOrder({
      id: parseInt(id),
      customer: { name: 'John Doe', email: 'john@example.com', phone: '+1 (555) 123-4567' },
      vessel: { name: 'Sea Ray 270', type: 'Cruiser', year: 2018 },
      service: 'Engine Diagnostic',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      description: 'Engine making unusual noise at high RPM. Customer reports occasional loss of power.',
      assignedDate: '2026-03-27',
      dueDate: '2026-03-29',
    });
    setNotes([
      { id: 1, author: 'Mike Davis', content: 'Initial inspection complete. Found worn spark plugs.', createdAt: '2026-03-27 10:30' },
    ]);
    setTimeEntries([
      { id: 1, technician: 'Mike Davis', duration: 1.5, activity: 'Initial diagnosis', createdAt: '2026-03-27' },
    ]);
    setLoading(false);
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    // TODO: Call API to add note
    // POST /api/technician/orders/:id/notes
    setNotes([...notes, {
      id: Date.now(),
      author: 'Current User',
      content: newNote,
      createdAt: new Date().toLocaleString(),
    }]);
    setNewNote('');
  };

  const handleAddTime = async () => {
    if (!timeSpent) return;
    // TODO: Call API to add time entry
    // POST /api/technician/orders/:id/time-entries
    setTimeEntries([...timeEntries, {
      id: Date.now(),
      technician: 'Current User',
      duration: parseFloat(timeSpent),
      activity: 'Work performed',
      createdAt: new Date().toLocaleDateString(),
    }]);
    setTimeSpent('');
  };

  const handleStatusUpdate = async (newStatus) => {
    // TODO: Call API to update status
    // PATCH /api/technician/orders/:id/status
    setOrder({ ...order, status: newStatus });
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!order) {
    return <Typography>Order not found</Typography>;
  }

  const statusColors = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    PAUSED: 'default',
    COMPLETED: 'success',
  };

  const statusOptions = ['PENDING', 'IN_PROGRESS', 'PAUSED', 'COMPLETED'];

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/technician/orders')}
        sx={{ mb: 2 }}
      >
        Back to Queue
      </Button>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Order Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" gutterBottom>Work Order #{order.id}</Typography>
                  <Typography color="text.secondary">{order.service}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={order.priority}
                    color={order.priority === 'HIGH' ? 'error' : order.priority === 'NORMAL' ? 'info' : 'default'}
                  />
                  <Chip
                    label={order.status.replace('_', ' ')}
                    color={statusColors[order.status]}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Description</Typography>
              <Typography paragraph>{order.description}</Typography>

              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Customer</Typography>
                  <Typography>{order.customer.name}</Typography>
                  <Typography color="text.secondary">{order.customer.email}</Typography>
                  <Typography color="text.secondary">{order.customer.phone}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Vessel</Typography>
                  <Typography>{order.vessel.name}</Typography>
                  <Typography color="text.secondary">{order.vessel.type} ({order.vessel.year})</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Assigned Date</Typography>
                  <Typography>{order.assignedDate}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Due Date</Typography>
                  <Typography>{order.dueDate}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Update Status</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    variant={order.status === status ? 'contained' : 'outlined'}
                    onClick={() => handleStatusUpdate(status)}
                  >
                    {status.replace('_', ' ')}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Work Notes</Typography>
              <List>
                {notes.map((note) => (
                  <ListItem key={note.id} alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2">{note.author}</Typography>
                          <Typography variant="caption" color="text.secondary">{note.createdAt}</Typography>
                        </Box>
                      }
                      secondary={note.content}
                    />
                  </ListItem>
                ))}
              </List>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a work note..."
                sx={{ mt: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                sx={{ mt: 1 }}
              >
                Add Note
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Time Tracking */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Time Tracking
              </Typography>
              <List>
                {timeEntries.map((entry) => (
                  <ListItem key={entry.id}>
                    <ListItemText
                      primary={`${entry.duration}h - ${entry.activity}`}
                      secondary={entry.createdAt}
                    />
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  value={timeSpent}
                  onChange={(e) => setTimeSpent(e.target.value)}
                  placeholder="Hours"
                  inputProps={{ step: 0.5, min: 0 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddTime}
                  disabled={!timeSpent}
                >
                  Add
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Actions</Typography>
              <Button fullWidth variant="outlined" sx={{ mb: 1 }}>
                Print Work Order
              </Button>
              <Button fullWidth variant="outlined">
                Request Parts
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
