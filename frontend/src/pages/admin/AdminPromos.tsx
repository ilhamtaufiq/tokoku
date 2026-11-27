import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import { FORM_CARD, INPUT, LABEL, Notice, ROW, btn, cx } from './adminUi';

export default function AdminPromos() {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('');
  const [limit, setLimit] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const create = useMutation({
    mutationFn: () =>
      api.adminCreatePromo({
        code,
        discount_type: type,
        discount_value: value,
        min_subtotal: minSubtotal || '0',
        usage_limit: limit ? Number(limit) : null,
      }),
    onSuccess: (res) => {
      setMessage({ kind: 'ok', text: `Promo ${res.code} dibuat.` });
      setCode('');
      setValue('');
      setMinSubtotal('');
      setLimit('');
    },
    onError: (e) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal membuat promo.' }),
  });

  return (
    <section className="max-w-[560px]">
      <PageHeader title="Kode promo" subtitle="Buat kode diskon persen atau nominal, lengkap dengan minimum belanja dan kuota." />
      <form
        className={FORM_CARD}
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          create.mutate();
        }}
      >
        <label className={LABEL}>
          Kode
          <input className={INPUT} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} />
        </label>
        <div className={ROW}>
          <label className={LABEL}>
            Jenis
            <select className={INPUT} value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}>
              <option value="percent">Persen (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </label>
          <label className={LABEL}>
            Nilai {type === 'percent' ? '(%)' : '(Rp)'}
            <input className={INPUT} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} required />
          </label>
        </div>
        <div className={ROW}>
          <label className={LABEL}>
            Minimum belanja (Rp)
            <input className={INPUT} inputMode="numeric" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
          </label>
          <label className={LABEL}>
            Kuota pemakaian
            <input className={INPUT} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Tanpa batas" />
          </label>
        </div>
        {message && <Notice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</Notice>}
        <button type="submit" className={cx(btn('primary'), 'w-full')} disabled={create.isPending}>
          Buat promo
        </button>
      </form>
    </section>
  );
}
