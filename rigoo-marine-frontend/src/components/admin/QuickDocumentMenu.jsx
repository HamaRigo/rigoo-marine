/* eslint-disable react/prop-types */
/**
 * QuickDocumentMenu — compact icon-button dropdown that lets Admin / Team Lead
 * instantly generate an invoice or quotation directly from a work order card
 * or a team request card without navigating to the Finance section.
 *
 * Usage:
 *   <QuickDocumentMenu
 *     onCreateInvoice={() => handleDocument('invoice', entity)}
 *     onCreateQuotation={() => handleDocument('quotation', entity)}
 *   />
 */
import { useState } from 'react';
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip, Divider, Typography,
} from '@mui/material';
import ArticleRoundedIcon   from '@mui/icons-material/ArticleRounded';
import ReceiptRoundedIcon   from '@mui/icons-material/ReceiptRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';

export default function QuickDocumentMenu({
  onCreateInvoice,
  onCreateQuotation,
  size = 'small',
  label = '',      // optional entity label shown as menu header
  color = 'primary',
}) {
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);

  const openMenu = (e) => {
    e.stopPropagation();
    setAnchor(e.currentTarget);
  };
  const closeMenu = () => setAnchor(null);

  return (
    <>
      <Tooltip title="Create invoice / quotation">
        <IconButton
          size={size}
          color={color}
          onClick={openMenu}
          aria-label="create document"
        >
          <ArticleRoundedIcon fontSize={size} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={closeMenu}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { elevation: 3, sx: { minWidth: 200 } } }}
      >
        {label && [
          <Typography key="label" variant="caption" color="text.secondary"
            sx={{ px: 2, pt: 1, pb: 0.5, display: 'block' }}>
            {label}
          </Typography>,
          <Divider key="div" sx={{ mb: 0.5 }} />,
        ]}

        <MenuItem dense onClick={() => { closeMenu(); onCreateInvoice?.(); }}>
          <ListItemIcon><ReceiptRoundedIcon fontSize="small" color="primary" /></ListItemIcon>
          <ListItemText primary="Create Invoice" primaryTypographyProps={{ variant: 'body2' }} />
        </MenuItem>

        <MenuItem dense onClick={() => { closeMenu(); onCreateQuotation?.(); }}>
          <ListItemIcon><RequestQuoteRoundedIcon fontSize="small" color="secondary" /></ListItemIcon>
          <ListItemText primary="Create Quotation" primaryTypographyProps={{ variant: 'body2' }} />
        </MenuItem>
      </Menu>
    </>
  );
}
