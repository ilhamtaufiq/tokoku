import type { Tone } from '../../pages/admin/adminUi';

/** Warna badge status untuk Badge shadcn. Memakai token Tokoku sehingga ikut mode gelap. */
export const TONE_BADGE: Record<Tone, string> = {
  neutral: 'border-transparent bg-surface-high text-ink-2',
  ok: 'border-transparent bg-success-soft text-on-success-soft',
  warn: 'border-transparent bg-warning-soft text-on-warning-soft',
  danger: 'border-transparent bg-error-soft text-on-error-soft',
  info: 'border-transparent bg-secondary-container text-on-secondary-container',
};

/** Tinggi kontrol minimal 44px di layar kecil, 36px di layar lebar. */
export const TOUCH_BTN = 'h-11 md:h-9';
