import { useRef, useState } from 'react';

/** Kanvas tanda tangan: digambar dengan mouse atau sentuhan. Hasilnya PNG data URL. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="h-40 w-full touch-none rounded-field border border-dashed border-outline bg-white"
        aria-label="Area tanda tangan"
        onPointerDown={(e) => {
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          drawing.current = true;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = point(e);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#1a1b22';
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          setDirty(true);
          onChange(canvasRef.current?.toDataURL('image/png') ?? null);
        }}
      />
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{dirty ? 'Tanda tangan tersimpan di formulir.' : 'Tanda tangan dengan mouse atau jari.'}</span>
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => {
            const canvas = canvasRef.current;
            canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
            setDirty(false);
            onChange(null);
          }}
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
