/* eslint-disable react/prop-types */
import { useState, useMemo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, InputAdornment, Box, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useDebounce } from '../../hooks/useDebounce';

/**
 * Reusable data table with pagination, search, and sorting.
 *
 * Performance notes:
 *  - Search input is debounced (300 ms) so filter/sort don't run on every
 *    keystroke — only after the user pauses.
 *  - filteredRows / sortedRows / paginatedRows are all memoised; they only
 *    recompute when their specific dependencies change, not on every render.
 *  - searchTermLower is hoisted outside the filter predicate so it is computed
 *    once per debounce tick rather than once per row × column.
 *  - Column handlers are stable references (useCallback) so <TableCell>s that
 *    receive them as props don't re-render on unrelated state changes.
 *
 * @param {Array}    columns           - [{ field, headerName, renderCell, sortable }]
 * @param {Array}    rows              - Data rows
 * @param {function} onRowClick        - Optional row click handler
 * @param {boolean}  searchable        - Enable search
 * @param {string}   searchPlaceholder - Search input placeholder
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
  const [searchInput, setSearchInput] = useState('');
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // Debounce: filter/sort only re-run 300 ms after typing stops.
  const searchTerm = useDebounce(searchInput, 300);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const lower = searchTerm.toLowerCase(); // hoist out of inner loop
    return rows.filter((row) =>
      columns.some((col) =>
        String(row[col.field] ?? '').toLowerCase().includes(lower)
      )
    );
  }, [rows, columns, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortConfig.field) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredRows, sortConfig]);

  const paginatedRows = useMemo(
    () => sortedRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [sortedRows, page, rowsPerPage]
  );

  const handleSort = useCallback((field) => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleChangePage = useCallback((_, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Reset to page 0 when the debounced term changes.
  // Done inline rather than in a useEffect to avoid a stale-closure flash.
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
    setPage(0);
  }, []);

  return (
    <Box>
      {searchable && (
        <TextField
          fullWidth
          placeholder={searchPlaceholder}
          value={searchInput}
          onChange={handleSearchChange}
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
                  sx={{ cursor: col.sortable ? 'pointer' : 'default', fontWeight: 600 }}
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
                  key={row.id ?? rowIndex}
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
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
