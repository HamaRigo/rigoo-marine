import { Box, Typography, Chip, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';
import { adminApi, invoiceApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import { formatPrice, formatDate } from '../../utils/format';

const STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'warning', PAID: 'success', OVERDUE: 'error', CANCELLED: 'default',
};

export default function InvoiceManagement() {
  const { t } = useTranslation('admin');

  const columns = [
    { id: 'invoiceNumber', label: t('invoices.columns.number') },
    { id: 'clientId', label: t('invoices.columns.client') },
    { id: 'issueDate', label: t('invoices.columns.issueDate'),
      render: (r) => formatDate(r.issueDate) },
    { id: 'dueDate', label: t('invoices.columns.dueDate'),
      render: (r) => formatDate(r.dueDate) },
    { id: 'total', label: t('invoices.columns.total'),
      render: (r) => formatPrice(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { id: 'status', label: t('invoices.columns.status'),
      render: (r) => <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] || 'default'} /> },
  ];

  const handleDownload = async (id, number) => {
    const blob = await invoiceApi.downloadPdf(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('invoices.title')}</Typography>
      <FilterableTable
        queryKey={['admin', 'invoices']}
        fetchPage={adminApi.searchInvoices}
        columns={columns}
        rowKey={(r) => r.id}
        defaultSort="issueDate,desc"
        filters={[
          { id: 'status', label: t('filters.status'),
            options: STATUSES.map((s) => ({ value: s, label: s })) },
        ]}
        renderActions={(row) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleDownload(row.id, row.invoiceNumber)}
          >
            {t('invoices.downloadPdf')}
          </Button>
        )}
      />
    </Box>
  );
}
