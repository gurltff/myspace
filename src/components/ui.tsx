import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

const MONTH = new Date().toLocaleDateString('en', { month: 'long' }).toUpperCase();

/** A die-cut paper card: postcard (default), newspaper ("notepad") or chocolate card. */
export function Box({ title, children, className = '', delay = 0, hover = false, right, variant = 'player', bar, lace = true }: {
  title?: ReactNode; children: ReactNode; className?: string; delay?: number; hover?: boolean; right?: ReactNode;
  variant?: 'player' | 'notepad' | 'choco'; bar?: string; lace?: boolean;
}) {
  const anim = {
    initial: { opacity: 0, y: 22, rotate: -0.6 },
    animate: { opacity: 1, y: 0, rotate: 0 },
    transition: { duration: 0.75, ease: EASE, delay },
  };
  if (variant === 'notepad') {
    const head = bar ?? (typeof title === 'string' ? title : 'Wishful Study Club');
    return (
      <motion.section {...anim} className={`notepad ${hover ? 'hoverable' : ''}`}>
        <div className="np-bar flex items-center justify-center gap-2"><span>{head.replace(/ - Notepad$/, '').replace(/\.txt$/, '')}</span>{right}</div>
        <div className="np-menu"><span>1st edition</span><span>wish for your grades</span><span>{MONTH} MAIL</span></div>
        <div className={`p-3 ${className}`}>{children}</div>
      </motion.section>
    );
  }
  return (
    <motion.section {...anim} className={`nest-box ${variant === 'choco' ? 'choco' : ''} ${lace && variant !== 'choco' ? 'lacey' : ''} ${hover ? 'hoverable' : ''}`}>
      {(title || bar) && (
        <div className="win-bar">
          <span className="win-title">{title ?? bar}</span>
          {right}
          <span className="win-btns"><span /><span /></span>
        </div>
      )}
      <div className={`win-body ${className}`}>{children}</div>
    </motion.section>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-3 relative">
      <motion.h1
        initial={{ opacity: 0, y: 14, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 1, ease: EASE }}
        className="nest-title text-[40px] sm:text-[56px] break-words pr-16"
      >
        {children}
      </motion.h1>
      {sub && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }} className="label-blue mt-2 text-[18px]">
          {sub}
        </motion.p>
      )}
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
    <span title={title} onClick={onClick} className={`nest-tag ${onClick ? 'cursor-pointer hover:scale-105 transition' : ''}`} style={color ? { background: color, color: '#5a3631' } : undefined}>
      {children}
    </span>
  );
}

export function Bar({ value, color = 'var(--pink)', label }: { value: number | null; color?: string; label?: string }) {
  return (
    <div className="w-full h-3.5 rounded-full border-[1.5px] border-line bg-panel overflow-hidden relative" title={label}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, backgroundImage: 'linear-gradient(rgba(255,255,255,.65), rgba(255,255,255,0) 60%)' }}
        initial={{ width: 0 }}
        animate={{ width: `${value ?? 0}%` }}
        transition={{ duration: 1.2, ease: EASE }}
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
          style={{ color: value && n <= value ? '#c9707f' : 'var(--muted)', opacity: value && n <= value ? 1 : 0.4 }}
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
            className={`nest-box w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} max-h-[88vh] overflow-y-auto nest-scroll`}
            initial={{ y: 30, scale: 0.97, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="win-bar sticky top-0 z-10 bg-panel rounded-t-lg">
              <h3 className="win-title">{title}</h3>
              <button className="text-[13px] hover:text-ink transition" onClick={onClose} aria-label="close">✕</button>
            </div>
            <div className="win-body">{children}</div>
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
          className="relative font-bubble text-[13px] px-3.5 py-1 rounded-full border-[1.5px] border-line transition-colors duration-300 hover:bg-pill"
          style={{ color: value === t.id ? 'var(--cream)' : 'var(--ink)', background: value === t.id ? undefined : 'var(--cream)' }}
        >
          {value === t.id && (
            <motion.span layoutId="tab-bg" className="absolute inset-0 rounded-full" transition={{ duration: 0.5, ease: EASE }}
              style={{ background: 'var(--choco)', boxShadow: '3px 4px 0 var(--shadow)' }} />
          )}
          <span className="relative">{value === t.id ? '♥ ' : ''}{t.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-muted py-6 border-[1.5px] border-dashed border-line/60 rounded-xl">{children}</div>;
}

export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
      {children}
    </motion.div>
  );
}
export function Item({ children, className = '', ...rest }: { children: ReactNode; className?: string } & Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onDrag' | 'onDragStart' | 'onDragEnd'>) {
  return (
    <motion.div {...rest} className={className} variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} transition={{ duration: 0.55, ease: EASE }}>
      {children}
    </motion.div>
  );
}
