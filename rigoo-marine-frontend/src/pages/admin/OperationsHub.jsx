import BuildRoundedIcon      from '@mui/icons-material/BuildRounded';
import InventoryRoundedIcon   from '@mui/icons-material/InventoryRounded';
import HubLayout              from './HubLayout';
import OrderManagement        from './OrderManagement';
import InventoryManagement    from './InventoryManagement';

const TABS = [
  { label: 'Work Orders', icon: <BuildRoundedIcon />,     component: OrderManagement },
  { label: 'Inventory',   icon: <InventoryRoundedIcon />, component: InventoryManagement },
];

export default function OperationsHub() {
  return <HubLayout tabs={TABS} />;
}
