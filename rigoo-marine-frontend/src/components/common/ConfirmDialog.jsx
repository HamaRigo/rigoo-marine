/* eslint-disable react/prop-types */
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

/**
 * Reusable confirmation dialog component
 * @param {boolean} open - Dialog open state
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onConfirm - Callback when confirm is clicked
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} severity - "warning" | "info" | "error" | "success"
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'warning',
}) {
  const handleClose = () => {
    onClose();
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const severityConfig = {
    warning: { color: 'warning.main', icon: <WarningIcon /> },
    error: { color: 'error.main', icon: <WarningIcon /> },
    info: { color: 'info.main', icon: <InfoIcon /> },
    success: { color: 'success.main', icon: <InfoIcon /> },
  };

  const config = severityConfig[severity] || severityConfig.warning;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {config.icon}
          {title}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color={severity === 'warning' || severity === 'error' ? 'error' : 'primary'}
          autoFocus
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
