const formatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

/** Format rupiah untuk tampilan. Nilai dari backend sudah benar; frontend tidak menghitung ulang pajak. */
export function rp(value: string | number): string {
  return formatter.format(Number(value));
}

export function percent(value: string): string {
  return `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Menunggu pembayaran',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function formatDate(iso: string): string {
  return new Date(iso.endsWith('Z') ? iso : `${iso.replace(' ', 'T')}Z`).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
