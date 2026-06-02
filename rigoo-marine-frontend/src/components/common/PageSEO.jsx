import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://rigoomarine.com';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

/**
 * Drop-in SEO head for every public page.
 *
 * Usage (static page):
 *   <PageSEO titleKey="services.title" descriptionKey="services.description" />
 *
 * Usage (dynamic page with fetched data):
 *   <PageSEO title={boat.name} description={boat.desc} ogImage={boat.photos[0]} jsonLd={boatSchema} />
 */
export default function PageSEO({
  titleKey,
  title,
  descriptionKey,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noIndex = false,
  jsonLd,
}) {
  const { t, i18n } = useTranslation('seo');
  const { pathname } = useLocation();
  const lang = i18n.language?.startsWith('ar') ? 'ar' : 'en';
  const isAr = lang === 'ar';

  const resolvedTitle       = title       || (titleKey       ? t(titleKey)       : t('home.title'));
  const resolvedDescription = description || (descriptionKey ? t(descriptionKey) : t('home.description'));
  const resolvedCanonical   = canonical   || `${SITE_URL}${pathname}`;
  const resolvedOgImage     = ogImage     || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      {/* Core */}
      <html lang={lang} dir={isAr ? 'rtl' : 'ltr'} />
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={resolvedCanonical} />
      {noIndex
        ? <meta name="robots" content="noindex,nofollow" />
        : <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1" />
      }

      {/* Open Graph */}
      <meta property="og:title"       content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image"       content={resolvedOgImage} />
      <meta property="og:image:alt"   content={resolvedTitle} />
      <meta property="og:url"         content={resolvedCanonical} />
      <meta property="og:type"        content={ogType} />
      <meta property="og:site_name"   content={t('site.name')} />
      <meta property="og:locale"      content={isAr ? 'ar_QA' : 'en_US'} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image"       content={resolvedOgImage} />

      {/* Hreflang — same URL serves both languages via JS i18n */}
      <link rel="alternate" hreflang="en"      href={resolvedCanonical} />
      <link rel="alternate" hreflang="ar"      href={resolvedCanonical} />
      <link rel="alternate" hreflang="x-default" href={`${SITE_URL}${pathname}`} />

      {/* Geo targeting — Qatar market */}
      <meta name="geo.region"   content="QA" />
      <meta name="geo.placename" content="Doha, Qatar" />

      {/* JSON-LD Structured Data — accepts single object or array of schemas */}
      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).filter(Boolean).map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

/* ── Pre-built JSON-LD helpers ─────────────────────────────────────────────── */

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/#business`,
    name: 'Rigoo Marine',
    alternateName: 'ريغو مارين',
    description: 'Professional yacht and boat services, marketplace, and marine parts shop in Qatar.',
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.PNG`,
    image: `${SITE_URL}/og-default.jpg`,
    telephone: '',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Doha',
      addressCountry: 'QA',
    },
    areaServed: { '@type': 'Country', name: 'Qatar' },
    currenciesAccepted: 'QAR',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Marine Services',
      itemListElement: [
        'Boat Maintenance', 'Yacht Repair', 'Marine Mechanical Services',
        'Hull Structural Work', 'Anti-fouling Treatment', 'Marine Finishing',
      ].map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s } })),
    },
  };
}

export function buildServiceListSchema(services = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Rigoo Marine Services',
    url: `${SITE_URL}/services`,
    numberOfItems: services.length || undefined,
    itemListElement: services.map((svc, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Service',
        name: svc.nameEn || svc.name,
        description: svc.descriptionEn || svc.description,
        provider: { '@type': 'LocalBusiness', name: 'Rigoo Marine' },
      },
    })),
  };
}

export function buildBoatListSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boats & Yachts for Sale in Qatar',
    description: 'Verified boat and yacht listings on Rigoo Marine Marketplace, Qatar.',
    url: `${SITE_URL}/boats`,
  };
}

export function buildBoatSchema(listing, canonical) {
  if (!listing) return null;
  const name = listing.titleEn || listing.titleAr || 'Boat Listing';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: listing.descriptionEn || listing.descriptionAr || '',
    url: canonical,
    image: listing.mediaUrls?.[0] || `${SITE_URL}/og-default.jpg`,
    brand: listing.brand
      ? { '@type': 'Brand', name: listing.brand }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: listing.priceQar ?? '',
      priceCurrency: 'QAR',
      availability:
        listing.status === 'AVAILABLE'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonical,
      seller: { '@type': 'Organization', name: 'Rigoo Marine' },
    },
    additionalProperty: [
      listing.yearBuilt && { '@type': 'PropertyValue', name: 'Year Built', value: listing.yearBuilt },
      listing.lengthMeters && { '@type': 'PropertyValue', name: 'Length (m)', value: listing.lengthMeters },
      listing.boatType && { '@type': 'PropertyValue', name: 'Boat Type', value: listing.boatType },
      listing.locationCity && { '@type': 'PropertyValue', name: 'Location', value: listing.locationCity },
    ].filter(Boolean),
  };
}

export function buildProductSchema(product, canonical) {
  if (!product) return null;
  const name = product.nameEn || product.nameAr || 'Marine Product';
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: product.descriptionEn || product.descriptionAr || '',
    url: canonical,
    image: product.mediaUrls?.[0] || `${SITE_URL}/og-default.jpg`,
    sku: product.sku || undefined,
    brand: product.brand
      ? { '@type': 'Brand', name: product.brand }
      : undefined,
    offers: {
      '@type': 'Offer',
      price: product.priceQar ?? '',
      priceCurrency: 'QAR',
      availability:
        (product.stockQty ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: canonical,
      seller: { '@type': 'Organization', name: 'Rigoo Marine' },
    },
  };
}

export function buildBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined,
    })),
  };
}
