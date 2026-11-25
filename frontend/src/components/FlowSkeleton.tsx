import { card, skeleton } from './flowClasses';

/** Skeleton halaman keranjang saat data sedang dimuat. */
export function CartSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]" aria-hidden>
      <div className="flex min-w-0 flex-col gap-3">
        <div className={`${skeleton} h-12`} />
        {[0, 1].map((i) => (
          <div key={i} className={`${card} flex gap-3 p-3 md:gap-4 md:p-4`}>
            <div className={`${skeleton} size-20 shrink-0 md:size-24`} />
            <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-1">
              <div className={`${skeleton} h-4 w-3/4`} />
              <div className={`${skeleton} h-3 w-1/2`} />
              <div className={`${skeleton} mt-auto h-8 w-28`} />
            </div>
          </div>
        ))}
      </div>
      <div className={`${card} p-5 md:p-6`}>
        <div className={`${skeleton} mb-5 h-5 w-2/5`} />
        <div className="flex flex-col gap-3">
          <div className={`${skeleton} h-4 w-full`} />
          <div className={`${skeleton} h-4 w-4/5`} />
          <div className={`${skeleton} h-4 w-3/5`} />
        </div>
        <div className={`${skeleton} mt-5 h-12 w-full`} />
      </div>
    </div>
  );
}

/** Skeleton halaman checkout saat keranjang sedang dimuat. */
export function CheckoutSkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" aria-hidden>
      <div className="flex min-w-0 flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${card} flex flex-col gap-3 p-5 md:p-6`}>
            <div className={`${skeleton} h-5 w-1/3`} />
            <div className={`${skeleton} ${i === 0 ? 'h-24' : 'h-11'} w-full`} />
          </div>
        ))}
      </div>
      <div className={`${card} p-5 md:p-6`}>
        <div className={`${skeleton} mb-5 h-5 w-2/5`} />
        <div className="flex flex-col gap-3">
          <div className={`${skeleton} h-4 w-full`} />
          <div className={`${skeleton} h-4 w-4/5`} />
        </div>
        <div className={`${skeleton} mt-5 h-[52px] w-full`} />
      </div>
    </div>
  );
}
