import { useEffect, useState } from 'react';
import { Fade, Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children, timeout = 320 }) {
  const location = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => {
      setDisplayed(children);
      setShow(true);
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, timeout / 2);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    if (show) setDisplayed(children);
  }, [children, show]);

  return (
    <Fade in={show} timeout={timeout}>
      <Box sx={{ width: '100%' }}>{displayed}</Box>
    </Fade>
  );
}
