/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';

export default function BoatPhotoCarousel({ images = [], height = 480 }) {
  const [index, setIndex] = useState(0);
  const safe = images.filter(Boolean);

  if (safe.length === 0) {
    return (
      <Box
        sx={{
          height,
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
          borderRadius: 2,
        }}
      >
        <DirectionsBoatIcon sx={{ fontSize: 96 }} />
      </Box>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + safe.length) % safe.length);
  const next = () => setIndex((i) => (i + 1) % safe.length);

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.900' }}>
      <Box sx={{ position: 'relative', height, width: '100%' }}>
        {safe.map((src, i) => (
          <Box
            key={src + i}
            component="img"
            src={src}
            alt=""
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: i === index ? 1 : 0,
              transform: i === index ? 'scale(1)' : 'scale(1.04)',
              transition: 'opacity 0.5s ease, transform 0.6s ease',
            }}
          />
        ))}
      </Box>

      {safe.length > 1 && (
        <>
          <IconButton
            onClick={prev}
            sx={{
              position: 'absolute',
              top: '50%',
              left: 12,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
            aria-label="previous"
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            onClick={next}
            sx={{
              position: 'absolute',
              top: '50%',
              right: 12,
              transform: 'translateY(-50%)',
              bgcolor: 'rgba(0,0,0,0.5)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
            }}
            aria-label="next"
          >
            <ChevronRightIcon />
          </IconButton>

          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {safe.map((_, i) => (
              <Box
                key={i}
                onClick={() => setIndex(i)}
                sx={{
                  width: i === index ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: i === index ? 'white' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
