import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router';
import faq from '../content/help/faq.md?raw';
import { useSeo } from '../lib/seo';

/** Pusat bantuan: FAQ ditulis dalam Markdown di src/content/help. */
export default function Help() {
  useSeo({
    title: 'Bantuan dan FAQ',
    description: 'Jawaban atas pertanyaan seputar belanja, pembayaran, pesanan, dan ulasan di Tokoku.',
    canonicalPath: '/bantuan',
  });
  return (
    <section className="mx-auto max-w-[880px]">
      <div className="rounded-card border border-outline-soft bg-surface p-6 shadow-card sm:p-10">
    <article className="text-[15px] leading-relaxed text-ink-2 [&_h1]:mb-4 [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:font-bold [&_h1]:leading-9 [&_h1]:tracking-tight [&_h1]:text-ink [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1.5 [&_strong]:font-semibold [&_strong]:text-ink [&_a]:text-primary [&_a]:underline-offset-2 [&_code]:font-mono [&_code]:text-[13px] [&_table]:my-4 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_th]:border-b [&_th]:border-outline-soft [&_th]:px-2 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink [&_td]:border-b [&_td]:border-outline-soft [&_td]:px-2 [&_td]:py-2 [&_td]:align-top">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{faq}</ReactMarkdown>
      <p className="mt-6 text-xs text-muted">
        Tidak menemukan jawaban? <Link to="/pengembalian" className="font-semibold text-primary">Baca ketentuan pengembalian dana</Link>.
      </p>
    </article>
      </div>
    </section>
  );
}
