import { createTheme, responsiveFontSizes } from '@mui/material/styles';

const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const baseOptions = {
  palette: {
    primary: {
      main: '#006994',
      light: '#4c97c2',
      dark: '#004263',
    },
    secondary: {
      main: '#ff8f00',
      light: '#ffc04d',
      dark: '#c76000',
    },
    background: {
      default: '#f4f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(2.25rem, 5vw + 0.5rem, 3.75rem)' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em', fontSize: 'clamp(1.85rem, 4.2vw + 0.4rem, 3rem)' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 'clamp(1.55rem, 3vw + 0.4rem, 2.5rem)' },
    h4: { fontWeight: 700, letterSpacing: '-0.01em', fontSize: 'clamp(1.3rem, 2vw + 0.4rem, 2rem)' },
    h5: { fontWeight: 600, fontSize: 'clamp(1.15rem, 1.2vw + 0.5rem, 1.5rem)' },
    h6: { fontWeight: 600, fontSize: 'clamp(1rem, 0.8vw + 0.55rem, 1.25rem)' },
    body1: { fontSize: 'clamp(0.95rem, 0.3vw + 0.85rem, 1rem)' },
    body2: { fontSize: 'clamp(0.85rem, 0.2vw + 0.78rem, 0.9rem)' },
    button: { fontWeight: 600, letterSpacing: '0.01em' },
  },
  shape: {
    borderRadius: 12,
  },
  transitions: {
    easing: {
      easeInOut: easing.standard,
      easeOut: easing.emphasized,
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      sharp: easing.emphasized,
    },
    duration: {
      shortest: 120,
      shorter: 180,
      short: 220,
      standard: 280,
      complex: 360,
      enteringScreen: 280,
      leavingScreen: 220,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@keyframes rmFloat': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        '@keyframes rmShimmer': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        '@keyframes rmFadeUp': {
          '0%': { opacity: 0, transform: 'translateY(16px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes rmPulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,143,0,0.45)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,143,0,0)' },
        },
        html: { scrollBehavior: 'smooth', WebkitTextSizeAdjust: '100%' },
        body: {
          backgroundColor: '#f4f7fa',
          transition: `background-color 280ms ${easing.standard}`,
          overflowX: 'hidden',
        },
        img: { maxWidth: '100%', display: 'block' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-thumb': {
          background: 'rgba(0,105,148,0.25)',
          borderRadius: 8,
          transition: `background 220ms ${easing.standard}`,
        },
        '*::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(0,105,148,0.5)',
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.001ms !important',
            transitionDuration: '0.001ms !important',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          transition: `transform 180ms ${easing.standard}, box-shadow 220ms ${easing.standard}, background-color 180ms ${easing.standard}, color 180ms ${easing.standard}`,
          '&:hover': {
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          boxShadow: '0 4px 14px rgba(0, 105, 148, 0.18)',
          '&:hover': {
            boxShadow: '0 8px 22px rgba(0, 105, 148, 0.28)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderWidth: 1.5,
          '&:hover': { borderWidth: 1.5 },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: `background-color 180ms ${easing.standard}, transform 180ms ${easing.standard}, color 180ms ${easing.standard}`,
          '&:hover': { transform: 'scale(1.08)' },
          '&:active': { transform: 'scale(0.96)' },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.06)',
          transition: `transform 260ms ${easing.standard}, box-shadow 260ms ${easing.standard}, border-color 260ms ${easing.standard}`,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 14px 32px rgba(15, 23, 42, 0.12)',
            borderColor: 'rgba(0,105,148,0.18)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: `box-shadow 260ms ${easing.standard}`,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          transition: `background-color 280ms ${easing.standard}, box-shadow 280ms ${easing.standard}, backdrop-filter 280ms ${easing.standard}`,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          transition: `background-color 200ms ${easing.standard}, color 200ms ${easing.standard}, transform 200ms ${easing.standard}, box-shadow 200ms ${easing.standard}`,
          '&:hover': { transform: 'translateY(-1px)' },
        },
        clickable: {
          '&:active': { transform: 'translateY(0) scale(0.97)' },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `background-color 180ms ${easing.standard}, color 180ms ${easing.standard}, padding-left 180ms ${easing.standard}`,
          '&:hover': { paddingLeft: 20 },
          '&.Mui-selected': {
            backgroundColor: 'rgba(0,105,148,0.10)',
            '&:hover': { backgroundColor: 'rgba(0,105,148,0.16)' },
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: `box-shadow 200ms ${easing.standard}, border-color 200ms ${easing.standard}`,
          '&.Mui-focused': {
            boxShadow: '0 0 0 4px rgba(0,105,148,0.12)',
          },
        },
      },
    },
    MuiTooltip: {
      defaultProps: {
        enterDelay: 250,
        leaveDelay: 80,
        arrow: true,
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          transition: `color 180ms ${easing.standard}, text-decoration-color 180ms ${easing.standard}`,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          transition: `color 180ms ${easing.standard}`,
        },
      },
    },
    MuiDialog: {
      defaultProps: { keepMounted: false },
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(2px)',
          backgroundColor: 'rgba(15,23,42,0.45)',
        },
      },
    },
  },
};

export const buildTheme = (direction = 'ltr') =>
  responsiveFontSizes(createTheme({ ...baseOptions, direction }), {
    breakpoints: ['sm', 'md', 'lg'],
    factor: 2.4,
  });

export default buildTheme();
