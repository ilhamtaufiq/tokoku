import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ShippingDestination } from '../api/types';

/** Pencarian kota/kecamatan/kelurahan untuk tujuan atau asal pengiriman (RajaOngkir). */
export function DestinationSearch({
  value,
  onChange,
  id,
}: {
  value: ShippingDestination | null;
  onChange: (dest: ShippingDestination | null) => void;
  id: string;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<ShippingDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = term.trim();
    if (q.length < 3 || value?.label === term) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      api
        .shippingSearch(q)
        .then((list) => !cancelled && setResults(list))
        .catch((e: Error) => !cancelled && setError(e.message))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [term, value]);

  return (
    <div className="relative">
      <input
        id={id}
        className="w-full rounded-field border border-outline bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={value && term === value.label ? value.label : term}
        onChange={(e) => {
          setTerm(e.target.value);
          if (value) onChange(null);
        }}
        placeholder="Ketik kota, kecamatan, atau kode pos (min. 3 huruf)"
        autoComplete="off"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={`${id}-list`}
      />
      {loading && <p className="mt-1.5 text-xs text-muted">Mencari…</p>}
      {error && <p className="mt-1.5 text-xs text-error">{error}</p>}
      {results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-card border border-outline-soft bg-surface p-1 shadow-pop">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                role="option"
                aria-selected={value?.id === r.id}
                className="block w-full rounded-field px-3 py-2 text-left text-sm text-ink hover:bg-surface-low"
                onClick={() => {
                  onChange(r);
                  setTerm(r.label);
                  setResults([]);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
