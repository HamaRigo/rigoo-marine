/* eslint-disable react/prop-types */
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Full-screen loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress size={60} sx={{ mb: 2 }} />
      <Typography variant="body1" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

/**
 * Inline spinner for buttons and small areas
 */
export function InlineSpinner({ size = 24 }) {
  return <CircularProgress size={size} />;
}

/**
 * Loading state for card-based layouts
 */
export function LoadingCard() {
  return (
    <Box
      sx={{
        p: 3,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default LoadingOverlay;
