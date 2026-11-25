import { percent, rp } from '../lib/money';
import type { Breakdown as BreakdownType } from '../api/types';

export type BreakdownSummary = Omit<BreakdownType, 'lines' | 'taxable_gross'>;

const row = 'flex justify-between gap-3';

/** Rincian harga: harga sudah termasuk PPN, lalu dipisah menjadi DPP dan PPN. Hanya menampilkan angka dari server. */
export function Breakdown({ data }: { data: BreakdownSummary }) {
  const hasDiscount = Number(data.discount_total) > 0;
  const hasTaxable = Number(data.dpp) > 0;
  const dt = 'text-sm text-ink-2';
  const dd = 'm-0 text-sm font-semibold tabular-nums text-ink';
  const subDt = 'text-[13px] text-muted';
  const subDd = 'm-0 text-[13px] font-medium tabular-nums text-muted';
  return (
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
      {hasTaxable && (
        <>
          <div className={`${row} pl-3`}>
            <dt className={subDt}>DPP (dasar pengenaan pajak)</dt>
            <dd className={subDd}>{rp(data.dpp)}</dd>
          </div>
          <div className={`${row} pl-3`}>
            <dt className={subDt}>PPN {percent(data.ppn_rate)}</dt>
            <dd className={subDd}>{rp(data.ppn)}</dd>
          </div>
        </>
      )}
      <div className={row}>
        <dt className={dt}>Ongkos kirim (tidak kena PPN)</dt>
        <dd className={dd}>{rp(data.shipping_fee)}</dd>
      </div>
      <div className={`${row} mt-1.5 items-baseline border-t border-outline pt-4`}>
        <dt className="font-display text-base font-semibold text-ink">Total bayar</dt>
        <dd className="m-0 font-display text-[26px] font-bold tracking-tight text-primary tabular-nums">{rp(data.grand_total)}</dd>
      </div>
    </dl>
  );
}
