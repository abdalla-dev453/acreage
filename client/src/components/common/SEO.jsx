import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_TITLE = 'Acreage | Digital Agriculture Marketplace';
const DEFAULT_DESCRIPTION = 'Connect with verified farmers and buyers. List crops, take orders, track sales, and settle via M-Pesa — all in one platform built for modern agriculture.';
const DEFAULT_OG_IMAGE = '/og-image.png';

export default function SEO({ title, description, image }) {
  const location = useLocation();
  const pageTitle = title || DEFAULT_TITLE;
  const pageDescription = description || DEFAULT_DESCRIPTION;
  const ogImage = image || DEFAULT_OG_IMAGE;
  const url = `https://acreage.co.ke${location.pathname}`;

  useEffect(() => {
    document.title = pageTitle;

    const setMeta = (name, content) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setProperty = (property, content) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', pageDescription);
    setProperty('og:title', pageTitle);
    setProperty('og:description', pageDescription);
    setProperty('og:image', ogImage);
    setProperty('og:url', url);
    setProperty('og:type', 'website');
    setMeta('twitter:card', 'summary_large_image');
  }, [pageTitle, pageDescription, ogImage, url]);

  return null;
}
