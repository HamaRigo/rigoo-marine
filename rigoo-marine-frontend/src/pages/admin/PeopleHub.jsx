import PeopleRoundedIcon       from '@mui/icons-material/PeopleRounded';
import GroupsRoundedIcon        from '@mui/icons-material/GroupsRounded';
import HistoryRoundedIcon       from '@mui/icons-material/HistoryRounded';
import HubLayout                from './HubLayout';
import UserManagement           from './UserManagement';
import TeamRequestManagement    from './TeamRequestManagement';
import AuditLog                 from './AuditLog';

const TABS = [
  { label: 'Users',         icon: <PeopleRoundedIcon />,    component: UserManagement },
  { label: 'Team Requests', icon: <GroupsRoundedIcon />,    component: TeamRequestManagement },
  { label: 'Audit Log',     icon: <HistoryRoundedIcon />,   component: AuditLog },
];

export default function PeopleHub() {
  return <HubLayout tabs={TABS} />;
}
