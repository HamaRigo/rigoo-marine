import { Box, Stack, IconButton, Tooltip } from '@mui/material';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { maintenanceApi } from '../../services/api';
import { dossierKey } from '../../hooks/maintenance/useVesselDossier';

/**
 * Renders a row of small previews under a history-record card. Images
 * render their actual content; PDFs / non-image types render a glyph
 * chip. Click an image to open the file in a new tab; the delete button
 * is admin-or-owner-only (the backend ownership check still gates).
 *
 * <p>Optional {@code vesselId} drives the optimistic dossier-cache
 * invalidation on delete so the timeline refreshes without a manual
 * refetch.
 */
export default function AttachmentThumbs({ attachments, vesselId, readOnly = false }) {
  const { t } = useTranslation('maintenance');
  const qc = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: (id) => maintenanceApi.deleteAttachment(id),
    onSuccess: () => {
      if (vesselId != null) qc.invalidateQueries({ queryKey: dossierKey(vesselId) });
      toast.success(t('attachments.deleted'));
    },
    onError: (err) => {
      const code = err.response?.data?.errorCode;
      toast.error(code ? t(`errors.${code}`, { defaultValue: err.message }) : err.message);
    },
  });

  if (!attachments || attachments.length === 0) return null;

  return (
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
      {attachments.map((a) => {
        const isImage = (a.contentType || '').startsWith('image/');
        const open = () => window.open(a.url, '_blank', 'noopener,noreferrer');
        return (
          <Box
            key={a.id}
            sx={{
              position: 'relative',
              width: 64, height: 64,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              '&:hover .att-del': { opacity: 1 },
            }}
            onClick={open}
          >
            {isImage ? (
              <Box
                component="img"
                src={a.url}
                alt={a.filename || 'attachment'}
                loading="lazy"
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <Box sx={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'action.hover', color: 'text.secondary',
              }}>
                {a.contentType === 'application/pdf'
                  ? <PictureAsPdfRoundedIcon fontSize="small" />
                  : <InsertDriveFileRoundedIcon fontSize="small" />}
              </Box>
            )}
            {!readOnly && (
              <Tooltip title={t('attachments.delete')}>
                <IconButton
                  className="att-del"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('attachments.deleteConfirm'))) {
                      removeMutation.mutate(a.id);
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2, right: 2,
                    bgcolor: 'rgba(255,255,255,0.85)',
                    opacity: 0,
                    transition: 'opacity 160ms ease',
                    p: 0.25,
                    '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      })}
    </Stack>
  );
}
