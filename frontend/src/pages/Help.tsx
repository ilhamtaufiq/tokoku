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
    <article className="help-page">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{faq}</ReactMarkdown>
      <p className="muted small">
        Tidak menemukan jawaban? <Link to="/pengembalian">Baca ketentuan pengembalian dana</Link>.
      </p>
    </article>
  );
}
