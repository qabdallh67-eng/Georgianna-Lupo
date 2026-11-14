import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';

interface SeoHeadProps {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  noIndex?: boolean;
  image?: string;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  noIndex = false,
  image,
}) => {
  const { lang, bootstrap } = useApp();
  const location = useLocation();

  useEffect(() => {
    const title = lang === 'ar' ? titleAr : titleEn;
    const desc = lang === 'ar' ? descriptionAr : descriptionEn;
    const configuredDomain =
      bootstrap?.site_settings?.canonical_domain ||
      import.meta.env.VITE_CANONICAL_DOMAIN ||
      window.location.origin;
    const cleanBase = configuredDomain.replace(/\/$/, '');
    const canonicalUrl = `${cleanBase}${location.pathname}`;
    const ogImg = image || '/assets/eduverse-logo.png';

    document.title = title;

    const setMeta = (selector: string, attrName: string, attrVal: string, content: string) => {
      let el = document.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta('meta[property="og:image"]', 'property', 'og:image', ogImg);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }, [lang, titleAr, titleEn, descriptionAr, descriptionEn, noIndex, image, location.pathname, bootstrap]);

  return null;
};
