import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { ApiError } from '../../api/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BTN, FIELD, FORM_BODY, FormField, FormNotice, PANEL, ROW } from '@/components/admin-products/ui';
import { cn } from 'cn';

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
      <Card className={PANEL}>
        <form
          className={FORM_BODY}
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            create.mutate();
          }}
        >
          <FormField label="Kode">
            <Input className={FIELD} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required maxLength={40} />
          </FormField>
          <div className={ROW}>
            <FormField label="Jenis">
              <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Persen (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </FormField>
            <FormField label={`Nilai ${type === 'percent' ? '(%)' : '(Rp)'}`}>
              <Input className={FIELD} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))} required />
            </FormField>
          </div>
          <div className={ROW}>
            <FormField label="Minimum belanja (Rp)">
              <Input className={FIELD} inputMode="numeric" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
            </FormField>
            <FormField label="Kuota pemakaian">
              <Input className={FIELD} inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Tanpa batas" />
            </FormField>
          </div>
          {message && <FormNotice kind={message.kind === 'ok' ? 'ok' : 'error'}>{message.text}</FormNotice>}
          <Button type="submit" className={cn(BTN, 'w-full')} disabled={create.isPending}>
            Buat promo
          </Button>
        </form>
      </Card>
    </section>
  );
}
