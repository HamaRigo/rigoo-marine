import ReceiptRoundedIcon       from '@mui/icons-material/ReceiptRounded';
import RequestQuoteRoundedIcon  from '@mui/icons-material/RequestQuoteRounded';
import HubLayout                from './HubLayout';
import InvoiceManagement        from './InvoiceManagement';
import QuotationManagement      from './QuotationManagement';

const TABS = [
  { label: 'Invoices',   icon: <ReceiptRoundedIcon />,      component: InvoiceManagement },
  { label: 'Quotations', icon: <RequestQuoteRoundedIcon />, component: QuotationManagement },
];

export default function FinanceHub() {
  return <HubLayout tabs={TABS} />;
}
