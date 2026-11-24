//! Perhitungan harga dengan PPN untuk harga INKLUSIF (harga katalog sudah termasuk PPN).
//!
//! Aturan:
//! - Subtotal = Σ (harga termasuk PPN × qty)
//! - Diskon dialokasikan proporsional ke tiap baris; sisa pembulatan masuk baris terakhir.
//! - Net kena pajak = Σ net baris yang `is_taxable`.
//! - DPP = round(net kena pajak ÷ (1 + tarif)), PPN = net kena pajak − DPP (selisih, supaya pas).
//! - Ongkir TIDAK kena PPN (dijumlahkan langsung ke total).
//! - Semua nilai rupiah dibulatkan ke 0 desimal (MidpointAwayFromZero).

pub mod handler;

use rust_decimal::{Decimal, RoundingStrategy};
use rust_decimal_macros::dec;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq)]
pub enum PricingError {
    #[error("qty harus lebih dari 0")]
    InvalidQty,
    #[error("harga tidak boleh negatif")]
    NegativePrice,
    #[error("diskon melebihi subtotal")]
    DiscountTooLarge,
    #[error("ongkir tidak boleh negatif")]
    NegativeShipping,
    #[error("tarif PPN di luar rentang 0–100")]
    InvalidRate,
    #[error("keranjang kosong")]
    EmptyCart,
}

#[derive(Debug, Clone)]
pub struct PricingLine {
    pub product_id: u64,
    pub name: String,
    pub unit_price: Decimal, // termasuk PPN
    pub qty: u32,
    pub is_taxable: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct LineResult {
    pub product_id: u64,
    pub name: String,
    #[serde(with = "rust_decimal::serde::str")]
    pub unit_price: Decimal,
    pub qty: u32,
    pub is_taxable: bool,
    #[serde(with = "rust_decimal::serde::str")]
    pub line_subtotal: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub line_discount: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub line_net: Decimal,
}

#[derive(Debug, Clone, Serialize)]
pub struct Breakdown {
    pub lines: Vec<LineResult>,
    #[serde(with = "rust_decimal::serde::str")]
    pub subtotal: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub discount_total: Decimal,
    /// Nilai kena pajak yang sudah termasuk PPN, setelah diskon.
    #[serde(with = "rust_decimal::serde::str")]
    pub taxable_gross: Decimal,
    /// Dasar pengenaan pajak (tanpa PPN).
    #[serde(with = "rust_decimal::serde::str")]
    pub dpp: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub ppn: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub ppn_rate: Decimal, // persen, mis. 11.00
    #[serde(with = "rust_decimal::serde::str")]
    pub shipping_fee: Decimal,
    #[serde(with = "rust_decimal::serde::str")]
    pub grand_total: Decimal,
}

fn round0(d: Decimal) -> Decimal {
    d.round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
}

/// `ppn_percent` dalam persen (mis. 11.00). `discount` adalah diskon total pada subtotal.
pub fn calculate(
    lines: &[PricingLine],
    discount: Decimal,
    shipping_fee: Decimal,
    ppn_percent: Decimal,
) -> Result<Breakdown, PricingError> {
    if lines.is_empty() {
        return Err(PricingError::EmptyCart);
    }
    if ppn_percent < Decimal::ZERO || ppn_percent > dec!(100) {
        return Err(PricingError::InvalidRate);
    }
    if shipping_fee < Decimal::ZERO {
        return Err(PricingError::NegativeShipping);
    }
    if discount < Decimal::ZERO {
        return Err(PricingError::DiscountTooLarge);
    }

    for l in lines {
        if l.qty == 0 {
            return Err(PricingError::InvalidQty);
        }
        if l.unit_price < Decimal::ZERO {
            return Err(PricingError::NegativePrice);
        }
    }

    let line_subtotals: Vec<Decimal> = lines
        .iter()
        .map(|l| round0(l.unit_price * Decimal::from(l.qty)))
        .collect();
    let subtotal: Decimal = line_subtotals.iter().sum();

    if discount > subtotal {
        return Err(PricingError::DiscountTooLarge);
    }

    // Alokasi diskon proporsional; sisa pembulatan masuk baris terakhir
    let mut allocated = Decimal::ZERO;
    let mut line_discounts = Vec::with_capacity(lines.len());
    let last = lines.len() - 1;
    for (i, sub) in line_subtotals.iter().enumerate() {
        let d = if i == last {
            discount - allocated
        } else if subtotal.is_zero() {
            Decimal::ZERO
        } else {
            round0(discount * *sub / subtotal)
        };
        allocated += d;
        line_discounts.push(d);
    }

    let mut results = Vec::with_capacity(lines.len());
    let mut taxable_gross = Decimal::ZERO;
    for (i, l) in lines.iter().enumerate() {
        let net = line_subtotals[i] - line_discounts[i];
        if l.is_taxable {
            taxable_gross += net;
        }
        results.push(LineResult {
            product_id: l.product_id,
            name: l.name.clone(),
            unit_price: l.unit_price,
            qty: l.qty,
            is_taxable: l.is_taxable,
            line_subtotal: line_subtotals[i],
            line_discount: line_discounts[i],
            line_net: net,
        });
    }

    let rate = ppn_percent / dec!(100);
    let dpp = round0(taxable_gross / (dec!(1) + rate));
    let ppn = taxable_gross - dpp;

    let grand_total = (subtotal - discount) + shipping_fee;

    Ok(Breakdown {
        lines: results,
        subtotal,
        discount_total: discount,
        taxable_gross,
        dpp,
        ppn,
        ppn_rate: ppn_percent,
        shipping_fee,
        grand_total,
    })
}

/// PPN yang sudah "tersembunyi" di dalam satu harga satuan inklusif (untuk ditampilkan di katalog).
pub fn ppn_included_in_price(price: Decimal, ppn_percent: Decimal, is_taxable: bool) -> Decimal {
    if !is_taxable || ppn_percent.is_zero() {
        return Decimal::ZERO;
    }
    let rate = ppn_percent / dec!(100);
    let dpp = round0(price / (dec!(1) + rate));
    price - dpp
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(id: u64, price: i64, qty: u32, taxable: bool) -> PricingLine {
        PricingLine {
            product_id: id,
            name: format!("P{id}"),
            unit_price: Decimal::from(price),
            qty,
            is_taxable: taxable,
        }
    }

    #[test]
    fn contoh_dokumen_inklusif_dengan_diskon_dan_ongkir() {
        // 2 × 111.000 = 222.000; diskon 22.200 → net 199.800
        // DPP = 180.000, PPN 11% = 19.800, ongkir 20.000 (tidak kena PPN)
        let lines = [line(1, 111_000, 2, true)];
        let b = calculate(&lines, Dec(22_200), Dec(20_000), dec!(11)).unwrap();
        assert_eq!(b.subtotal, Dec(222_000));
        assert_eq!(b.discount_total, Dec(22_200));
        assert_eq!(b.dpp, Dec(180_000));
        assert_eq!(b.ppn, Dec(19_800));
        assert_eq!(b.grand_total, Dec(219_800));
        assert_eq!(b.dpp + b.ppn + b.shipping_fee, b.grand_total);
    }

    #[test]
    fn tanpa_diskon_dan_ongkir() {
        let lines = [line(1, 111_000, 1, true)];
        let b = calculate(&lines, Dec(0), Dec(0), dec!(11)).unwrap();
        assert_eq!(b.dpp, Dec(100_000));
        assert_eq!(b.ppn, Dec(11_000));
        assert_eq!(b.grand_total, Dec(111_000));
    }

    #[test]
    fn pembulatan_dpp_ppn_tetap_pas() {
        // 100.000 ÷ 1,11 = 90.090,09 → DPP 90.090, PPN 9.910 (selisih)
        let lines = [line(1, 100_000, 1, true)];
        let b = calculate(&lines, Dec(0), Dec(0), dec!(11)).unwrap();
        assert_eq!(b.dpp, Dec(90_090));
        assert_eq!(b.ppn, Dec(9_910));
        assert_eq!(b.dpp + b.ppn, Dec(100_000));
    }

    #[test]
    fn campuran_kena_dan_tidak_kena_pajak() {
        // Produk A kena pajak 111.000; produk B tidak kena pajak 50.000
        // Diskon 16.100 dialokasikan proporsional: A = 11.100, B = 5.000 (sisa)
        // Net kena pajak A = 99.900 → DPP 90.000, PPN 9.900
        let lines = [line(1, 111_000, 1, true), line(2, 50_000, 1, false)];
        let b = calculate(&lines, Dec(16_100), Dec(0), dec!(11)).unwrap();
        // net kena pajak + net tidak kena pajak = subtotal − diskon
        assert_eq!(b.taxable_gross + b.lines[1].line_net, Dec(161_000 - 16_100));
        assert_eq!(b.dpp + b.ppn, b.taxable_gross);
        // produk tidak kena pajak tidak ikut DPP/PPN
        assert_eq!(b.lines[1].is_taxable, false);
        assert_eq!(b.grand_total, Dec(161_000 - 16_100));
        assert_eq!(b.dpp, Dec(90_000));
        assert_eq!(b.ppn, Dec(9_900));
    }

    #[test]
    fn semua_tidak_kena_pajak_ppn_nol() {
        let lines = [line(1, 50_000, 2, false)];
        let b = calculate(&lines, Dec(0), Dec(10_000), dec!(11)).unwrap();
        assert_eq!(b.dpp, Dec(0));
        assert_eq!(b.ppn, Dec(0));
        assert_eq!(b.grand_total, Dec(110_000));
    }

    #[test]
    fn tarif_nol_pkp_nonaktif() {
        let lines = [line(1, 111_000, 1, true)];
        let b = calculate(&lines, Dec(0), Dec(0), dec!(0)).unwrap();
        assert_eq!(b.dpp, Dec(111_000));
        assert_eq!(b.ppn, Dec(0));
    }

    #[test]
    fn diskon_alokasi_pas_dengan_total() {
        // Diskon tidak habis dibagi jumlah baris; total diskon harus tetap sama
        let lines = [line(1, 33_333, 1, true), line(2, 33_333, 1, true), line(3, 33_334, 1, true)];
        let b = calculate(&lines, Dec(10_000), Dec(0), dec!(11)).unwrap();
        let sum: Decimal = b.lines.iter().map(|l| l.line_discount).sum();
        assert_eq!(sum, Dec(10_000));
        assert_eq!(b.dpp + b.ppn, b.taxable_gross);
    }

    #[test]
    fn diskon_melebihi_subtotal_ditolak() {
        let lines = [line(1, 10_000, 1, true)];
        assert_eq!(
            calculate(&lines, Dec(10_001), Dec(0), dec!(11)).unwrap_err(),
            PricingError::DiscountTooLarge
        );
    }

    #[test]
    fn input_tidak_valid_ditolak() {
        assert_eq!(calculate(&[], Dec(0), Dec(0), dec!(11)).unwrap_err(), PricingError::EmptyCart);
        assert_eq!(
            calculate(&[line(1, 1000, 0, true)], Dec(0), Dec(0), dec!(11)).unwrap_err(),
            PricingError::InvalidQty
        );
        assert_eq!(
            calculate(&[line(1, 1000, 1, true)], Dec(0), dec!(-1), dec!(11)).unwrap_err(),
            PricingError::NegativeShipping
        );
    }

    #[test]
    fn ppn_tersembunyi_di_harga_satuan() {
        assert_eq!(ppn_included_in_price(Decimal::from(111_000), dec!(11), true), Decimal::from(11_000));
        assert_eq!(ppn_included_in_price(Decimal::from(111_000), dec!(11), false), Decimal::ZERO);
    }

    #[allow(non_snake_case)]
    fn Dec(v: i64) -> Decimal {
        Decimal::from(v)
    }
}
