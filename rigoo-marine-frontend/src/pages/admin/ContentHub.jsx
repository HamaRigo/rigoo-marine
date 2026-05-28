import PeopleAltRoundedIcon      from '@mui/icons-material/PeopleAltRounded';
import CompareRoundedIcon         from '@mui/icons-material/CompareRounded';
import PhotoLibraryRoundedIcon    from '@mui/icons-material/PhotoLibraryRounded';
import ContactSupportRoundedIcon  from '@mui/icons-material/ContactSupportRounded';
import EngineeringIcon            from '@mui/icons-material/Engineering';
import HubLayout                  from './HubLayout';
import TeamManagement             from './TeamManagement';
import GalleryManagement          from './GalleryManagement';
import MediaManagement            from './MediaManagement';
import ContactInfoManagement      from './ContactInfoManagement';
import ServiceManagement          from './ServiceManagement';

const TABS = [
  { label: 'Team Members',  icon: <PeopleAltRoundedIcon />,      component: TeamManagement },
  { label: 'Services',      icon: <EngineeringIcon />,            component: ServiceManagement },
  { label: 'Gallery',       icon: <CompareRoundedIcon />,         component: GalleryManagement },
  { label: 'Media',         icon: <PhotoLibraryRoundedIcon />,   component: MediaManagement },
  { label: 'Contact Info',  icon: <ContactSupportRoundedIcon />, component: ContactInfoManagement },
];

export default function ContentHub() {
  return <HubLayout tabs={TABS} />;
}
