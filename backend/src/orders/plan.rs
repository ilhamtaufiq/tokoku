//! Perencanaan pesanan per toko. Dipakai bersama oleh pratinjau harga dan checkout,
//! sehingga angka yang dilihat pembeli sama dengan angka yang disimpan.

use rust_decimal::Decimal;

use crate::{
    error::{AppError, AppResult},
    pricing::{calculate, Breakdown, PricingLine},
    promo::{self, PromoRow},
};

/// Keranjang untuk satu toko.
pub struct StoreGroup {
    pub store_id: u64,
    /// Ongkir flat toko ini (tidak kena PPN).
    pub shipping: Decimal,
    pub lines: Vec<PricingLine>,
}

/// Hasil perencanaan untuk satu toko.
pub struct StorePlan {
    pub breakdown: Breakdown,
    /// Promo toko ini yang dipakai (jika ada).
    pub promo: Option<PromoRow>,
}

/// Hitung rincian per toko. Promo hanya berlaku untuk toko yang memilikinya.
pub fn plan(groups: &[StoreGroup], promos: &[PromoRow], ppn: Decimal) -> AppResult<Vec<StorePlan>> {
    groups
        .iter()
        .map(|g| {
            let base = calculate(&g.lines, Decimal::ZERO, g.shipping, ppn)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            let promo = promos.iter().find(|p| p.store_id == g.store_id).cloned();
            let discount = match &promo {
                Some(p) => promo::discount_amount(p, base.subtotal)?,
                None => Decimal::ZERO,
            };
            let breakdown = calculate(&g.lines, discount, g.shipping, ppn)
                .map_err(|e| AppError::BadRequest(e.to_string()))?;
            Ok(StorePlan { breakdown, promo })
        })
        .collect()
}

/// Gabungkan rincian semua toko untuk tampilan ringkasan keranjang.
pub fn aggregate(plans: &[StorePlan]) -> Option<Breakdown> {
    let first = plans.first()?;
    let mut total = Breakdown {
        lines: Vec::new(),
        subtotal: Decimal::ZERO,
        discount_total: Decimal::ZERO,
        taxable_gross: Decimal::ZERO,
        dpp: Decimal::ZERO,
        ppn: Decimal::ZERO,
        ppn_rate: first.breakdown.ppn_rate,
        shipping_fee: Decimal::ZERO,
        grand_total: Decimal::ZERO,
    };
    for p in plans {
        let b = &p.breakdown;
        total.lines.extend(b.lines.iter().cloned());
        total.subtotal += b.subtotal;
        total.discount_total += b.discount_total;
        total.taxable_gross += b.taxable_gross;
        total.dpp += b.dpp;
        total.ppn += b.ppn;
        total.shipping_fee += b.shipping_fee;
        total.grand_total += b.grand_total;
    }
    Some(total)
}
