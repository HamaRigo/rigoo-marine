import BuildRoundedIcon      from '@mui/icons-material/BuildRounded';
import EngineeringIcon        from '@mui/icons-material/Engineering';
import InventoryRoundedIcon   from '@mui/icons-material/InventoryRounded';
import HubLayout              from './HubLayout';
import OrderManagement        from './OrderManagement';
import ServiceManagement      from './ServiceManagement';
import InventoryManagement    from './InventoryManagement';

const TABS = [
  { label: 'Work Orders', icon: <BuildRoundedIcon />,    component: OrderManagement },
  { label: 'Services',    icon: <EngineeringIcon />,     component: ServiceManagement },
  { label: 'Inventory',   icon: <InventoryRoundedIcon />, component: InventoryManagement },
];

export default function OperationsHub() {
  return <HubLayout tabs={TABS} />;
}
