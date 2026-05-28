/* eslint-disable react/prop-types */
import { useCallback, useRef, useState } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

/**
 * Drag-drop + click-to-pick file zone. Hands accepted files to the
 * parent via {@code onFilesAdded}; the parent owns upload + state.
 *
 * <p>No external library — native HTML drag events + a hidden
 * &lt;input type="file"&gt;. Keeps the bundle lean and matches the
 * project's "build-it-don't-import-it" stance on small UI surfaces.
 *
 * <p>Client-side filtering before passing to the parent: content-type
 * allowlist + size cap (matching the backend's V5 CHECK constraint of
 * 10 MB). Rejected files are surfaced as a transient warning chip so
 * the user understands why their drop produced fewer items than they
 * dropped.
 */
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = /^(image\/(jpeg|png|webp|gif|heic)|application\/pdf)$/;

export default function AttachmentDropzone({ pending, onFilesAdded, onRemove, max = 10 }) {
  const { t } = useTranslation('maintenance');
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState([]);

  // Accept files programmatically. Returns the accepted/rejected split
  // so the dragover badge + the input change handler share one path.
  const intake = useCallback((fileList) => {
    const accepted = [];
    const rej = [];
    const room = max - (pending?.length || 0);
    for (const f of Array.from(fileList || [])) {
      if (accepted.length >= room) {
        rej.push({ file: f, reason: 'max' });
        continue;
      }
      if (!ALLOWED_TYPES.test(f.type)) {
        rej.push({ file: f, reason: 'type' });
        continue;
      }
      if (f.size > MAX_BYTES) {
        rej.push({ file: f, reason: 'size' });
        continue;
      }
      accepted.push(f);
    }
    setRejected(rej);
    if (accepted.length > 0) onFilesAdded?.(accepted);
  }, [pending, max, onFilesAdded]);

  return (
    <Box>
      <Box
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          intake(e.dataTransfer.files);
        }}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          borderRadius: 1.5,
          p: 2,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 180ms ease',
          '&:hover': { borderColor: 'primary.main' },
        }}
      >
        <CloudUploadOutlinedIcon sx={{ color: 'text.secondary', mb: 0.5 }} />
        <Typography variant="body2" color="text.secondary">
          {t('attachments.dropzone.hint')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t('attachments.dropzone.limits')}
        </Typography>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          hidden
          onChange={(e) => intake(e.target.files)}
        />
      </Box>

      {/* Pending uploads (parent-owned state — each item has its own
          progress / error state managed in the dialog). */}
      {pending && pending.length > 0 && (
        <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
          {pending.map((p, i) => (
            <Chip
              key={`${p.name}-${i}`}
              label={`${p.name}${p.error ? ' — ' + p.error : ''}`}
              size="small"
              color={p.uploaded ? 'success' : p.error ? 'error' : 'default'}
              variant={p.uploaded ? 'filled' : 'outlined'}
              onDelete={onRemove ? () => onRemove(i) : undefined}
              deleteIcon={<CloseIcon />}
            />
          ))}
        </Stack>
      )}

      {/* Rejected files — surfaced once, cleared on next intake. */}
      {rejected.length > 0 && (
        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
          {rejected.map((r, i) => (
            <Chip
              key={i}
              size="small"
              color="warning"
              label={t(`attachments.rejected.${r.reason}`, { defaultValue: r.file.name })}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
