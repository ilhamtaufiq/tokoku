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
      className="relative flex w-full max-w-[560px] items-center"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <span
        className="material-symbols-outlined pointer-events-none absolute left-3 z-10 text-xl text-muted"
        aria-hidden
      >
        search
      </span>
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
        className="h-11 w-full rounded-pill border border-outline-soft bg-surface-low pl-10 pr-3 text-sm text-ink outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-muted focus:border-primary focus:bg-surface focus:ring-2 focus:ring-primary/20 max-[760px]:h-10"
      />

      {showList && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[70vh] overflow-y-auto rounded-card border border-outline-soft bg-surface p-1.5 shadow-xl"
          id={listId}
          role="listbox"
          aria-label="Saran produk"
        >
          {suggestions.isPending && <p className="m-0 px-3 py-3.5 text-sm text-muted">Mencari…</p>}
          {!suggestions.isPending && items.length === 0 && (
            <p className="m-0 px-3 py-3.5 text-sm text-muted">Tidak ada produk yang cocok dengan “{debounced}”.</p>
          )}
          {items.map((s, i) => (
            <button
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              type="button"
              className={`flex w-full cursor-pointer items-center gap-3 rounded-field px-2.5 py-2 text-left text-ink transition-colors duration-100 hover:bg-surface-low ${
                i === active ? 'bg-surface-low' : ''
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(`/products/${s.id}`)}
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-field bg-surface-high font-display font-bold text-muted">
                {s.image_url ? <img src={s.image_url} alt="" className="h-full w-full object-cover" /> : s.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex min-w-0 flex-col">
                <strong className="truncate text-sm font-semibold">{s.name}</strong>
                <span className="text-xs text-muted">{s.sku} · {rp(s.price)}</span>
              </span>
            </button>
          ))}
          {items.length > 0 && (
            <button
              type="button"
              className="mt-1 block w-full cursor-pointer rounded-none border-0 border-t border-outline-soft bg-transparent px-2.5 py-2.5 text-left text-[13px] font-semibold text-primary hover:underline"
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
