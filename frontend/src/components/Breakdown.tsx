import { percent, rp } from '../lib/money';
import type { Breakdown as BreakdownType } from '../api/types';

export type BreakdownSummary = Omit<BreakdownType, 'lines' | 'taxable_gross'>;

const row = 'flex items-baseline justify-between gap-3';

/** Rincian harga: harga sudah termasuk PPN, lalu dipisah menjadi DPP dan PPN. Hanya menampilkan angka dari server. */
export function Breakdown({ data }: { data: BreakdownSummary }) {
  const hasDiscount = Number(data.discount_total) > 0;
  const hasTaxable = Number(data.dpp) > 0;
  const dt = 'text-sm text-ink-2';
  const dd = 'm-0 font-mono text-sm font-semibold tabular-nums text-ink';
  const subDt = 'text-[13px] text-muted';
  const subDd = 'm-0 font-mono text-[13px] font-medium tabular-nums text-ink-2';
  return (
    <div className="flex flex-col gap-3">
      {/* Kartu rincian pajak: DPP dan PPN ditampilkan terpisah, sesuai faktur pajak. */}
      {hasTaxable && (
        <div className="flex flex-col gap-2 rounded-field border border-outline-soft bg-surface-low p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <span className="material-symbols-outlined !text-[18px] text-primary" aria-hidden>account_balance</span>
              Rincian pajak (PKP)
            </span>
            <span className="inline-flex h-6 items-center rounded-pill bg-success-soft px-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-on-success-soft">
              Resmi DJP
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className={subDt}>DPP (dasar pengenaan pajak)</span>
              <span className={subDd}>{rp(data.dpp)}</span>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className={subDt}>PPN {percent(data.ppn_rate)}</span>
              <span className={subDd}>{rp(data.ppn)}</span>
            </div>
          </div>
        </div>
      )}
      <dl className="m-0 flex flex-col gap-2.5">
        <div className={row}>
          <dt className={dt}>Subtotal (termasuk PPN)</dt>
          <dd className={dd}>{rp(data.subtotal)}</dd>
        </div>
        {hasDiscount && (
          <div className={row}>
            <dt className="text-sm text-success">Diskon</dt>
            <dd className={`${dd} text-success`}>−{rp(data.discount_total)}</dd>
          </div>
        )}
        <div className={row}>
          <dt className={dt}>Ongkos kirim (tidak kena PPN)</dt>
          <dd className={dd}>{rp(data.shipping_fee)}</dd>
        </div>
        <div className={`${row} mt-1 border-t border-dashed border-outline pt-3`}>
          <dt className="font-display text-base font-semibold text-ink">Total bayar</dt>
          <dd className="m-0 font-mono text-[24px] font-bold leading-8 tracking-[-0.02em] tabular-nums text-primary">{rp(data.grand_total)}</dd>
        </div>
      </dl>
    </div>
  );
}
