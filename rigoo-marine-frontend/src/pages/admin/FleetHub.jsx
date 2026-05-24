import HandymanRoundedIcon   from '@mui/icons-material/HandymanRounded';
import VerifiedRoundedIcon    from '@mui/icons-material/VerifiedRounded';
import HubLayout              from './HubLayout';
import MaintenanceDashboard   from './MaintenanceDashboard';
import VesselInspections      from './VesselInspections';

const TABS = [
  { label: 'Maintenance',  icon: <HandymanRoundedIcon />,  component: MaintenanceDashboard },
  { label: 'Inspections',  icon: <VerifiedRoundedIcon />,  component: VesselInspections },
];

export default function FleetHub() {
  return <HubLayout tabs={TABS} />;
}
