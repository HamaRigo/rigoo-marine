/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState, memo } from 'react';
import {
  Card, CardContent, Stack, TextField, MenuItem, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, TablePagination, Typography,
  CircularProgress, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

/**
 * Reusable admin table.
 *
 * Props:
 *  - queryKey: string[] root for react-query (e.g. ['admin', 'orders'])
 *  - fetchPage(params): async fn returning Spring Page<T> ({content, totalElements, ...})
 *  - columns: [{ id, label, render?(row) }]
 *  - filters: optional [{ id, label, options: [{value, label}] }]
 *  - rowKey(row): unique key per row
 *  - renderActions?(row): optional cell on the right
 *  - defaultSort: 'createdAt,desc'
 */
const FilterableTable = memo(function FilterableTable({
  queryKey,
  fetchPage,
  columns,
  filters = [],
  rowKey,
  renderActions,
  defaultSort = 'createdAt,desc',
  defaultFilters = {},
}) {
  const { t } = useTranslation('admin');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [filterValues, setFilterValues] = useState(
    Object.fromEntries(filters.map((f) => [f.id, defaultFilters[f.id] ?? ''])),
  );
  const [debouncedFilterValues, setDebouncedFilterValues] = useState(filterValues);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedFilterValues(filterValues), 300);
    return () => clearTimeout(handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filterValues)]);

  // Reset to first page when search/filter changes
  const debouncedFilterKey = JSON.stringify(debouncedFilterValues);
   
  useEffect(() => { setPage(0); }, [debouncedQ, debouncedFilterKey]);

  const params = useMemo(() => {
    const p = { page, size, sort: defaultSort };
    if (debouncedQ) p.q = debouncedQ;
    for (const [k, v] of Object.entries(debouncedFilterValues)) {
      if (v !== '' && v !== 'ALL') p[k] = v;
    }
    return p;
  }, [debouncedQ, debouncedFilterValues, page, size, defaultSort]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchPage(params),
    placeholderData: keepPreviousData,
  });

  const rows = data?.content || [];
  const total = data?.totalElements ?? 0;

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 2 }}
          alignItems={{ sm: 'center' }}
        >
          <TextField
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('filters.searchPlaceholder')}
            size="small"
            sx={{ minWidth: { sm: 240 }, width: { xs: '100%', sm: 'auto' } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {filters.map((f) => {
            const onChange = (e) => setFilterValues((prev) => ({ ...prev, [f.id]: e.target.value }));
            if (f.type === 'date') {
              return (
                <TextField
                  key={f.id}
                  type="date"
                  size="small"
                  label={f.label}
                  value={filterValues[f.id]}
                  onChange={onChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: { sm: 150 }, width: { xs: '100%', sm: 'auto' } }}
                />
              );
            }
            if (f.type === 'text') {
              return (
                <TextField
                  key={f.id}
                  size="small"
                  label={f.label}
                  value={filterValues[f.id]}
                  onChange={onChange}
                  sx={{ minWidth: { sm: 160 }, width: { xs: '100%', sm: 'auto' } }}
                />
              );
            }
            return (
              <TextField
                key={f.id}
                select
                size="small"
                label={f.label}
                value={filterValues[f.id]}
                onChange={onChange}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">{t('filters.all')}</MenuItem>
                {f.options.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </TextField>
            );
          })}
        </Stack>

        {isError ? (
          <Alert severity="error">{t('pagination.error')}</Alert>
        ) : (
          <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <Table size="small" sx={{ minWidth: 480 }}>
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.id}>{c.label}</TableCell>
                  ))}
                  {renderActions && <TableCell align="right">{t('users.actions')}</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + (renderActions ? 1 : 0)} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">{t('pagination.empty')}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={rowKey(row)} hover>
                      {columns.map((c) => (
                        <TableCell key={c.id}>{c.render ? c.render(row) : row[c.id]}</TableCell>
                      ))}
                      {renderActions && (
                        <TableCell align="right">{renderActions(row)}</TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => { setSize(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage={t('pagination.rowsPerPage')}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} ${t('pagination.of')} ${count}`}
          sx={{
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-input': {
              display: { xs: 'none', sm: 'flex' },
            },
          }}
        />
      </CardContent>
    </Card>
  );
});

export default FilterableTable;
