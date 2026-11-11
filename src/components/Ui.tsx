import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useHome } from '../hooks/HomeContext';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="modal-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="modal" role="dialog" aria-modal="true" aria-label={title} initial={{ y: 24, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 16, opacity: 0 }}>
            <div className="row between" style={{ marginBottom: '.6rem' }}>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Toasts() {
  const { toasts, bursts } = useHome();
  return (
    <>
      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} className={`toast ${t.kind === 'error' ? 'error' : ''}`} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>{t.text}</motion.div>
          ))}
        </AnimatePresence>
      </div>
      {bursts.length > 0 && (
        <div className="burst" aria-hidden>
          {bursts.map((b) =>
            Array.from({ length: 9 }, (_, i) => (
              <i key={`${b.id}-${i}`} style={{ left: `${b.x + (i - 4) * 5}%`, fontSize: 18 + (i % 3) * 8, animationDelay: `${i * 0.09}s`, color: i % 2 ? '#DFAEAA' : '#C98F8A' }}>♥</i>
            )),
          )}
        </div>
      )}
    </>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty card">
      <span className="hand">{title}</span>
      {children}
    </div>
  );
}

export function Loading({ rows = 2 }: { rows?: number }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" />)}
    </div>
  );
}

export function ErrorBox({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <b>Something went a little wrong.</b> {text}{' '}
      {retry && <button className="btn small" onClick={retry}>Try again</button>}
    </div>
  );
}

export function PageHead({ title, hand, children }: { title: string; hand?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1 style={{ fontSize: 'clamp(1.8rem,4.5vw,2.6rem)' }}>{title}</h1>
      {hand && <div className="hand">{hand}</div>}
      {children}
    </div>
  );
}
