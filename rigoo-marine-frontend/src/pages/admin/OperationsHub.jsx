import BuildRoundedIcon      from '@mui/icons-material/BuildRounded';
import InventoryRoundedIcon   from '@mui/icons-material/InventoryRounded';
import GroupsRoundedIcon      from '@mui/icons-material/GroupsRounded';
import HubLayout              from './HubLayout';
import OrderManagement        from './OrderManagement';
import InventoryManagement    from './InventoryManagement';
import TeamRequestManagement  from './TeamRequestManagement';

const TABS = [
  { label: 'Work Orders',   icon: <BuildRoundedIcon />,     component: OrderManagement },
  { label: 'Team Requests', icon: <GroupsRoundedIcon />,    component: TeamRequestManagement },
  { label: 'Inventory',     icon: <InventoryRoundedIcon />, component: InventoryManagement },
];

export default function OperationsHub() {
  return <HubLayout tabs={TABS} />;
}
