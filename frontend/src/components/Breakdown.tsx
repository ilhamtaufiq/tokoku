import { percent, rp } from '../lib/money';
import type { Breakdown as BreakdownType } from '../api/types';

export type BreakdownSummary = Omit<BreakdownType, 'lines' | 'taxable_gross'>;

/** Rincian harga: harga sudah termasuk PPN, lalu dipisah menjadi DPP dan PPN. Hanya menampilkan angka dari server. */
export function Breakdown({ data }: { data: BreakdownSummary }) {
  const hasDiscount = Number(data.discount_total) > 0;
  const hasTaxable = Number(data.dpp) > 0;
  return (
    <dl className="breakdown">
      <div>
        <dt>Subtotal (termasuk PPN)</dt>
        <dd>{rp(data.subtotal)}</dd>
      </div>
      {hasDiscount && (
        <div className="discount">
          <dt>Diskon</dt>
          <dd>−{rp(data.discount_total)}</dd>
        </div>
      )}
      {hasTaxable && (
        <>
          <div className="sub">
            <dt>DPP (dasar pengenaan pajak)</dt>
            <dd>{rp(data.dpp)}</dd>
          </div>
          <div className="sub">
            <dt>PPN {percent(data.ppn_rate)}</dt>
            <dd>{rp(data.ppn)}</dd>
          </div>
        </>
      )}
      <div>
        <dt>Ongkos kirim (tidak kena PPN)</dt>
        <dd>{rp(data.shipping_fee)}</dd>
      </div>
      <div className="total">
        <dt>Total bayar</dt>
        <dd>{rp(data.grand_total)}</dd>
      </div>
    </dl>
  );
}
