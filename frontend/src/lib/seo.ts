import { useEffect } from 'react';

const SITE_NAME = 'Tokoku';
const DEFAULT_TITLE = 'Tokoku — Perlengkapan sekolah & elektronik, harga sudah termasuk PPN';
const DEFAULT_DESCRIPTION =
  'Belanja laptop, mouse, tas sekolah, dan perlengkapan belajar. Harga sudah termasuk PPN dengan rincian pajak yang transparan.';

export interface SeoOptions {
  /** Judul halaman tanpa nama situs. Kosong = judul default. */
  title?: string;
  description?: string;
  /** Path kanonik, mis. "/products/3". Default: path saat ini tanpa query. */
  canonicalPath?: string;
  /** URL gambar absolut untuk preview media sosial. */
  image?: string | null;
  /** Data terstruktur schema.org. */
  jsonLd?: Record<string, unknown> | null;
  /** Halaman privat tidak boleh masuk indeks mesin pencari. */
  noindex?: boolean;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Mengatur judul, deskripsi, canonical, Open Graph, robots, dan JSON-LD per halaman. */
export function useSeo(opts: SeoOptions) {
  const jsonKey = opts.jsonLd ? JSON.stringify(opts.jsonLd) : '';
  const { title, description, canonicalPath, image, noindex } = opts;

  useEffect(() => {
    const origin = window.location.origin;
    const pageTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
    const pageDescription = description ?? DEFAULT_DESCRIPTION;
    const canonical = `${origin}${canonicalPath ?? window.location.pathname}`;

    document.title = pageTitle;
    upsertMeta('name', 'description', pageDescription);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    upsertCanonical(canonical);

    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'id_ID');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', pageTitle);
    upsertMeta('property', 'og:description', pageDescription);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image ?? `${origin}/favicon.svg`);
    upsertMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', pageTitle);
    upsertMeta('name', 'twitter:description', pageDescription);

    const existing = document.getElementById('jsonld');
    if (jsonKey) {
      const script = (existing as HTMLScriptElement | null) ?? document.createElement('script');
      script.id = 'jsonld';
      script.type = 'application/ld+json';
      script.textContent = jsonKey;
      if (!existing) document.head.appendChild(script);
    } else if (existing) {
      existing.remove();
    }
  }, [title, description, canonicalPath, image, noindex, jsonKey]);
}
