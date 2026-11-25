import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';

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
    <section className="narrow">
      <PageHeader title="Kode promo" subtitle="Buat kode diskon persen atau nominal, lengkap dengan minimum belanja dan kuota." />
      <form
        className="card form"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          create.mutate();
        }}
      >
        <label>
          Kode
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} />
        </label>
        <div className="row">
          <label>
            Jenis
            <select value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}>
              <option value="percent">Persen (%)</option>
              <option value="fixed">Nominal (Rp)</option>
            </select>
          </label>
          <label>
            Nilai {type === 'percent' ? '(%)' : '(Rp)'}
            <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} required />
          </label>
        </div>
        <div className="row">
          <label>
            Minimum belanja (Rp)
            <input inputMode="numeric" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
          </label>
          <label>
            Kuota pemakaian
            <input inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Tanpa batas" />
          </label>
        </div>
        {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
        <button className="btn primary block" disabled={create.isPending}>Buat promo</button>
      </form>
    </section>
  );
}
