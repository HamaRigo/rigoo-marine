/* eslint-disable react/prop-types */
import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, InputAdornment, Box, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

/**
 * Reusable data table with pagination, search, and sorting
 * @param {Array} columns - Column definitions [{ field, headerName, renderCell, sortable }]
 * @param {Array} rows - Data rows
 * @param {function} onRowClick - Optional row click handler
 * @param {boolean} searchable - Enable search
 * @param {string} searchPlaceholder - Search input placeholder
 */
export default function DataTable({
  columns,
  rows,
  onRowClick,
  searchable = true,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No data available',
}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // Filter rows based on search
  const filteredRows = rows.filter((row) =>
    columns.some((col) =>
      String(row[col.field] || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort rows
  const sortedRows = [...filteredRows].sort((a, b) => {
    if (!sortConfig.field) return 0;
    const aVal = a[sortConfig.field];
    const bVal = b[sortConfig.field];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate
  const paginatedRows = sortedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      {/* Search Bar */}
      {searchable && (
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      )}

      {/* Table */}
      <TableContainer
        sx={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderRadius: 2,
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <Table sx={{ minWidth: { xs: 560, sm: 640 } }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  onClick={() => col.sortable && handleSort(col.field)}
                  sx={{
                    cursor: col.sortable ? 'pointer' : 'default',
                    fontWeight: 600,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {col.headerName}
                    {col.sortable && sortConfig.field === col.field && (
                      <Typography variant="caption">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, rowIndex) => (
                <TableRow
                  key={row.id || rowIndex}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.field}>
                      {col.renderCell
                        ? col.renderCell(row[col.field], row)
                        : renderCellContent(row[col.field])}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={filteredRows.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        sx={{
          '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', gap: 1 },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-input': {
            display: { xs: 'none', sm: 'flex' },
          },
        }}
      />
    </Box>
  );
}

function renderCellContent(value) {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
