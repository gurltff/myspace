import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

export function Box({ title, children, className = '', delay = 0, hover = false, right }: {
  title?: ReactNode; children: ReactNode; className?: string; delay?: number; hover?: boolean; right?: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20, delay }}
      className={`nest-box ${hover ? 'hoverable' : ''} p-3 ${className}`}
    >
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <h2 className="nest-pill flex-1 text-[17px] sm:text-[19px]">{title}</h2>
          {right}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3">
      <motion.h1
        initial={{ opacity: 0, y: -10, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        className="nest-title text-[34px] sm:text-[46px] break-words"
      >
        {children}
      </motion.h1>
      {sub && <p className="text-muted mt-1 text-[17px]">{sub}</p>}
    </div>
  );
}

export function Btn({ children, variant = '', small, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: '' | 'pink' | 'sky' | 'butter' | 'ghost'; small?: boolean }) {
  return (
    <button type="button" {...rest} className={`nest-btn ${variant} ${small ? 'small' : ''} ${rest.className ?? ''}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[15px] font-bold text-muted block mb-0.5">{label}</span>
      {children}
    </label>
  );
}

export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`nest-input ${p.className ?? ''}`} />;
}
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`nest-input ${p.className ?? ''}`} />;
}
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={`nest-input ${p.className ?? ''}`} />;
}

export function Tag({ children, color, onClick, title }: { children: ReactNode; color?: string; onClick?: () => void; title?: string }) {
  return (
    <span title={title} onClick={onClick} className={`nest-tag ${onClick ? 'cursor-pointer hover:scale-105 transition' : ''}`} style={color ? { background: color, color: '#3e3a2e' } : undefined}>
      {children}
    </span>
  );
}

export function Bar({ value, color = 'var(--sage)', label }: { value: number | null; color?: string; label?: string }) {
  return (
    <div className="w-full h-4 rounded-full border-2 border-line bg-panel2 overflow-hidden relative" title={label}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,.35) 0 6px, transparent 6px 12px)' }}
        initial={{ width: 0 }}
        animate={{ width: `${value ?? 0}%` }}
        transition={{ type: 'spring', stiffness: 60, damping: 15 }}
      />
    </div>
  );
}

export function Stars({ value, onChange }: { value: number | null; onChange?: (v: number | null) => void }) {
  return (
    <span className="inline-flex gap-0.5" title="confidence">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(value === n ? null : n)}
          className={`text-[17px] leading-none transition-transform hover:scale-125 ${onChange ? 'cursor-pointer' : 'cursor-default'}`}
          style={{ color: value && n <= value ? '#e9b949' : 'var(--muted)', opacity: value && n <= value ? 1 : 0.4 }}
        >
          ★
        </button>
      ))}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 bg-black/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={`nest-box p-4 w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto nest-scroll`}
            initial={{ y: 40, scale: 0.94, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <h3 className="nest-pill flex-1">{title}</h3>
              <button className="nest-btn ghost small" onClick={onClose} aria-label="close">✕</button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="relative font-round text-[15px] px-3 py-0.5 rounded-full border-2 border-line transition-transform hover:-translate-y-0.5"
          style={{ background: value === t.id ? 'var(--sage)' : 'var(--panel2)', color: value === t.id ? '#3e3a2e' : 'var(--ink)' }}
        >
          {value === t.id && <motion.span layoutId="tab-dot" className="absolute -top-1.5 -right-1 text-[12px]">✿</motion.span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-muted py-6 border-2 border-dashed border-line/40 rounded-xl">{children}</div>;
}

export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
      {children}
    </motion.div>
  );
}
export function Item({ children, className = '', ...rest }: { children: ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'>) {
  return (
    <motion.div {...rest} className={className} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
      {children}
    </motion.div>
  );
}
