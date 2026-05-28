import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import HistoryRoundedIcon       from '@mui/icons-material/HistoryRounded';
import HubLayout                from './HubLayout';
import UserManagement           from './UserManagement';
import AuditLog                 from './AuditLog';

const TABS = [
  { label: 'Users',     icon: <PeopleRoundedIcon />,  component: UserManagement },
  { label: 'Audit Log', icon: <HistoryRoundedIcon />, component: AuditLog },
];

export default function PeopleHub() {
  return <HubLayout tabs={TABS} />;
}
