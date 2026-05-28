import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Chip,
  TextField, InputAdornment, CircularProgress, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip, Pagination,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { inventoryApi } from '../../services/api';

export default function TechnicianInventory() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['technician-inventory', search, page],
    queryFn: () => inventoryApi.search({ q: search || undefined, page: page - 1, size: 20 }),
    keepPreviousData: true,
  });

  const parts = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4">Parts &amp; Inventory</Typography>
        <TextField
          size="small"
          placeholder="Search parts…"
          value={search}
          onChange={handleSearch}
          sx={{ minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
      </Box>

      {isError && <Alert severity="error" sx={{ mb: 3 }}>Failed to load inventory.</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>Part Name</strong></TableCell>
                  <TableCell><strong>Category</strong></TableCell>
                  <TableCell><strong>Part Number</strong></TableCell>
                  <TableCell align="right"><strong>Stock</strong></TableCell>
                  <TableCell align="right"><strong>Unit Price (QAR)</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {parts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No parts found.
                    </TableCell>
                  </TableRow>
                )}
                {parts.map((part) => (
                  <TableRow key={part.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{part.name}</Typography>
                      {part.description && (
                        <Typography variant="caption" color="text.secondary">{part.description.slice(0, 60)}{part.description.length > 60 ? '…' : ''}</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip label={part.category || '—'} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{part.partNumber || '—'}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {part.stockQuantity != null && part.minStockLevel != null && part.stockQuantity <= part.minStockLevel && (
                          <Tooltip title="Low stock">
                            <WarningAmberIcon fontSize="small" color="warning" />
                          </Tooltip>
                        )}
                        <Typography variant="body2">{part.stockQuantity ?? '—'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {part.unitPrice != null ? Number(part.unitPrice).toFixed(2) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={part.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                        color={part.stockQuantity > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, p) => setPage(p)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
