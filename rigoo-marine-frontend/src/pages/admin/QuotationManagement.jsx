import { Box, Typography, Chip, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import FilterableTable from '../../components/admin/FilterableTable';
import { formatPrice, formatDate } from '../../utils/format';

const STATUSES = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'];
const STATUS_COLORS = {
  DRAFT: 'default', SENT: 'info', ACCEPTED: 'success',
  REJECTED: 'error', EXPIRED: 'warning',
};

export default function QuotationManagement() {
  const { t } = useTranslation('admin');

  const columns = [
    { id: 'quotationNumber', label: t('quotations.columns.number') },
    { id: 'clientId', label: t('quotations.columns.client') },
    { id: 'issueDate', label: t('quotations.columns.issueDate'),
      render: (r) => formatDate(r.issueDate) },
    { id: 'expiryDate', label: t('quotations.columns.expiryDate'),
      render: (r) => formatDate(r.expiryDate) },
    { id: 'total', label: t('quotations.columns.total'),
      render: (r) => formatPrice(r.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { id: 'status', label: t('quotations.columns.status'),
      render: (r) => <Chip size="small" label={r.status} color={STATUS_COLORS[r.status] || 'default'} /> },
  ];

  const handleDownload = async (id, number) => {
    const blob = await adminApi.downloadQuotationPdf(id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation-${number || id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>{t('quotations.title')}</Typography>
      <FilterableTable
        queryKey={['admin', 'quotations']}
        fetchPage={adminApi.searchQuotations}
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
            onClick={() => handleDownload(row.id, row.quotationNumber)}
          >
            {t('quotations.downloadPdf')}
          </Button>
        )}
      />
    </Box>
  );
}
