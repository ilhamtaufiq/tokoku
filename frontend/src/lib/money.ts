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

/** Sisa waktu sampai tenggat, dihitung dari ISO timestamp (UTC). */
export function sisaWaktu(iso: string): string {
  const due = new Date(iso.endsWith('Z') ? iso : `${iso.replace(' ', 'T')}Z`).getTime();
  const days = Math.ceil((due - Date.now()) / 86_400_000);
  if (days > 1) return `sisa ${days} hari`;
  if (days === 1) return 'tinggal 1 hari';
  if (days === 0) return 'jatuh tempo hari ini';
  return 'sudah melewati tenggat';
}
