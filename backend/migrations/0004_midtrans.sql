-- Ganti Xendit ke Midtrans: kolom referensi & URL pembayaran dibuat generik
ALTER TABLE orders
  CHANGE COLUMN xendit_invoice_id payment_ref VARCHAR(64) NULL,
  CHANGE COLUMN xendit_invoice_url payment_url VARCHAR(500) NULL;
