import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enNavbar from './locales/en/navbar.json';
import enHome from './locales/en/home.json';
import enAuth from './locales/en/auth.json';
import enWorkOrder from './locales/en/workorder.json';
import enAdmin from './locales/en/admin.json';
import enMarketplace from './locales/en/marketplace.json';
import arCommon from './locales/ar/common.json';
import arNavbar from './locales/ar/navbar.json';
import arHome from './locales/ar/home.json';
import arAuth from './locales/ar/auth.json';
import arWorkOrder from './locales/ar/workorder.json';
import arAdmin from './locales/ar/admin.json';
import arMarketplace from './locales/ar/marketplace.json';

export const SUPPORTED_LANGUAGES = ['en', 'ar'];
export const RTL_LANGUAGES = ['ar'];

export const isRTL = (lng) => RTL_LANGUAGES.includes(lng);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ['common', 'navbar', 'home', 'auth', 'workorder', 'admin', 'marketplace'],
    defaultNS: 'common',
    resources: {
      en: { common: enCommon, navbar: enNavbar, home: enHome, auth: enAuth, workorder: enWorkOrder, admin: enAdmin, marketplace: enMarketplace },
      ar: { common: arCommon, navbar: arNavbar, home: arHome, auth: arAuth, workorder: arWorkOrder, admin: arAdmin, marketplace: arMarketplace },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'rigoo.lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    returnNull: false,
  });

const applyDocumentDirection = (lng) => {
  const dir = isRTL(lng) ? 'rtl' : 'ltr';
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', lng);
    document.documentElement.setAttribute('dir', dir);
  }
};

applyDocumentDirection(i18n.language);
i18n.on('languageChanged', applyDocumentDirection);

export default i18n;
