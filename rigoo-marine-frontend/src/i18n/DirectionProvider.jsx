/* eslint-disable react/prop-types */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { ThemeProvider } from '@mui/material/styles';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { buildTheme } from '../theme';
import { isRTL } from './index';

const ltrCache = createCache({ key: 'mui' });
const rtlCache = createCache({ key: 'mui-rtl', stylisPlugins: [prefixer, rtlPlugin] });

export default function DirectionProvider({ children }) {
  const { i18n } = useTranslation();
  const direction = isRTL(i18n.language) ? 'rtl' : 'ltr';
  const cache = direction === 'rtl' ? rtlCache : ltrCache;
  const theme = useMemo(() => buildTheme(direction), [direction]);

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
