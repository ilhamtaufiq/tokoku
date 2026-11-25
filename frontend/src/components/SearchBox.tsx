import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { rp } from '../lib/money';

/** Kotak pencarian header dengan saran produk. Panah untuk memilih, Enter untuk membuka, Esc untuk menutup. */
export function SearchBox({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const listId = useId();
  const wrapRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value.trim()), 250);
    return () => window.clearTimeout(t);
  }, [value]);

  const suggestions = useQuery({
    queryKey: ['suggest', debounced],
    queryFn: () => api.suggest(debounced),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });
  const items = debounced.length >= 2 ? (suggestions.data ?? []) : [];
  const showList = open && debounced.length >= 2;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setActive(-1);
    onNavigate?.();
    navigate(path);
  };

  const submit = () => {
    if (active >= 0 && items[active]) {
      go(`/products/${items[active].id}`);
      return;
    }
    const q = value.trim();
    go(q ? `/?q=${encodeURIComponent(q)}#katalog` : '/#katalog');
  };

  return (
    <form
      ref={wrapRef}
      className="header-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <span className="material-symbols-outlined" aria-hidden>search</span>
      <input
        type="search"
        placeholder="Cari laptop, mouse, tas sekolah, atau buku tulis…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!showList || items.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
            setActive(-1);
          }
        }}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-label="Cari produk"
      />

      {showList && (
        <div className="suggest" id={listId} role="listbox" aria-label="Saran produk">
          {suggestions.isPending && <p className="suggest-note">Mencari…</p>}
          {!suggestions.isPending && items.length === 0 && (
            <p className="suggest-note">Tidak ada produk yang cocok dengan “{debounced}”.</p>
          )}
          {items.map((s, i) => (
            <button
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              type="button"
              className={`suggest-item ${i === active ? 'on' : ''}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(`/products/${s.id}`)}
            >
              <span className="suggest-thumb">
                {s.image_url ? <img src={s.image_url} alt="" /> : s.name.charAt(0).toUpperCase()}
              </span>
              <span className="suggest-text">
                <strong>{s.name}</strong>
                <span className="muted small">{s.sku} · {rp(s.price)}</span>
              </span>
            </button>
          ))}
          {items.length > 0 && (
            <button
              type="button"
              className="suggest-all"
              onClick={() => go(`/?q=${encodeURIComponent(debounced)}#katalog`)}
            >
              Lihat semua hasil untuk “{debounced}”
            </button>
          )}
        </div>
      )}
    </form>
  );
}
