import DirectionsBoatRoundedIcon from '@mui/icons-material/DirectionsBoatRounded';
import MarkChatUnreadRoundedIcon  from '@mui/icons-material/MarkChatUnreadRounded';
import StorefrontRoundedIcon      from '@mui/icons-material/StorefrontRounded';
import ReceiptLongRoundedIcon     from '@mui/icons-material/ReceiptLongRounded';
import ContactSupportRoundedIcon  from '@mui/icons-material/ContactSupportRounded';
import HubLayout                  from './HubLayout';
import BoatListingManagement      from './BoatListingManagement';
import BoatInquiryManagement      from './BoatInquiryManagement';
import ProductManagement          from './ProductManagement';
import ShopOrderManagement        from './ShopOrderManagement';
import ProductInquiryManagement   from './ProductInquiryManagement';

const TABS = [
  { label: 'Boats',            icon: <DirectionsBoatRoundedIcon />,   component: BoatListingManagement },
  { label: 'Boat Inquiries',   icon: <MarkChatUnreadRoundedIcon />,   component: BoatInquiryManagement },
  { label: 'Products',         icon: <StorefrontRoundedIcon />,       component: ProductManagement },
  { label: 'Shop Orders',      icon: <ReceiptLongRoundedIcon />,      component: ShopOrderManagement },
  { label: 'Shop Inquiries',   icon: <ContactSupportRoundedIcon />,   component: ProductInquiryManagement },
];

export default function MarketplaceHub() {
  return <HubLayout tabs={TABS} />;
}
