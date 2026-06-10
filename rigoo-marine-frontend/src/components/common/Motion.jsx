/* eslint-disable react/prop-types */
import { useEffect, useRef, useState, Children, cloneElement, isValidElement } from 'react';
import { Box, Fade, Grow, Slide, Zoom, useTheme } from '@mui/material';

function useInView({ threshold = 0.12, rootMargin = '0px 0px -5% 0px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const fallbackRef = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || (once && inView)) return undefined;

    // Guarantee visibility even if IntersectionObserver doesn't fire on mobile
    fallbackRef.current = setTimeout(() => setInView(true), 750);

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      clearTimeout(fallbackRef.current);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          clearTimeout(fallbackRef.current);
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearTimeout(fallbackRef.current);
    };
  }, [threshold, rootMargin, once, inView]);

  return [ref, inView];
}

const TRANSITIONS = {
  fade: Fade,
  grow: Grow,
  zoom: Zoom,
  slide: Slide,
};

export function Reveal({
  children,
  variant = 'fade',
  direction = 'up',
  delay = 0,
  timeout = 600,
  threshold = 0.12,
  once = true,
  sx,
  ...rest
}) {
  const [ref, inView] = useInView({ threshold, once });
  const TransitionComp = TRANSITIONS[variant] || Fade;
  const transitionProps = { in: inView, timeout, style: { transitionDelay: `${delay}ms` } };
  if (variant === 'slide') {
    transitionProps.direction = direction;
    transitionProps.appear = true;
    transitionProps.mountOnEnter = false;
    transitionProps.unmountOnExit = false;
  }

  // Clip escaped slide content so translated-out elements don't bleed into adjacent sections
  const clipOverflow = variant === 'slide' ? 'hidden' : 'visible';

  return (
    <Box ref={ref} sx={{ minHeight: 1, overflow: clipOverflow, ...sx }} {...rest}>
      <TransitionComp {...transitionProps}>
        <Box sx={{ width: '100%' }}>{children}</Box>
      </TransitionComp>
    </Box>
  );
}

export function Stagger({
  children,
  variant = 'fade',
  direction = 'up',
  step = 90,
  initialDelay = 0,
  timeout = 520,
  threshold = 0.1,
  component = 'div',
  sx,
}) {
  const [ref, inView] = useInView({ threshold });
  const TransitionComp = TRANSITIONS[variant] || Fade;
  const items = Children.toArray(children).filter(Boolean);

  return (
    <Box ref={ref} component={component} sx={sx}>
      {items.map((child, idx) => {
        const delay = initialDelay + idx * step;
        const transitionProps = {
          in: inView,
          timeout,
          style: { transitionDelay: `${delay}ms` },
        };
        if (variant === 'slide') {
          transitionProps.direction = direction;
        }
        const wrapped = isValidElement(child) ? child : <span>{child}</span>;
        return (
          <TransitionComp key={wrapped.key ?? idx} {...transitionProps}>
            <Box sx={{ width: '100%' }}>{wrapped}</Box>
          </TransitionComp>
        );
      })}
    </Box>
  );
}

export function HoverLift({ children, lift = 6, sx, ...rest }) {
  const theme = useTheme();
  const child = Children.only(children);
  const merged = {
    transition: theme.transitions.create(['transform', 'box-shadow'], {
      duration: 260,
    }),
    '&:hover': {
      transform: `translateY(-${lift}px)`,
      boxShadow: '0 18px 40px rgba(15,23,42,0.16)',
    },
    ...(child.props.sx || {}),
    ...sx,
  };
  return cloneElement(child, { ...rest, sx: merged });
}

export default Reveal;
