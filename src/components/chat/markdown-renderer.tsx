'use client';

import React, { memo, useId, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { twemojify } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeUrl(url: string): string {
  const lower = url.trimStart().toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) return '#';
  return url;
}

function resolveImg(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return resolveMediaUrl(url) ?? url;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(z => Math.min(5, Math.max(0.1, z * (e.deltaY > 0 ? 0.9 : 1.11))));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        aria-label="Close"
      >
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {zoom !== 1 && (
        <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70 select-none">
          {Math.round(zoom * 100)}%
        </span>
      )}
      <img
        src={src}
        alt=""
        style={{ maxWidth: '100vw', maxHeight: '100vh', transform: `scale(${zoom})`, transition: 'transform 0.1s' }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>,
    document.body,
  );
}

// ── Spoiler ───────────────────────────────────────────────────────────────────

function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setShown(v => !v)}
      onKeyDown={(e) => { if (e.key === 'Enter') setShown(v => !v); }}
      className={`cursor-pointer select-none rounded px-1 py-0.5 transition-all ${
        shown ? 'bg-neutral-500/20 text-inherit' : 'bg-neutral-500/80 text-transparent **:invisible'
      }`}
    >
      {children}
    </span>
  );
}

// ── Inline renderer ───────────────────────────────────────────────────────────

type KG = { n: number };

// Safe heading tag lookup — avoids JSX namespace entirely
const HEADING_TAGS: React.ElementType[] = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function renderInline(text: string, pfx: string, kg: KG, onImg?: (s: string) => void): React.ReactNode[] {
  if (!text) return [];
  const k = () => `${pfx}-${kg.n++}`;

  const rules: [RegExp, (m: RegExpExecArray) => React.ReactNode][] = [
    // Inline code — highest priority, not further parsed
    [/`([^`]+)`/, (m) => (
      <code key={k()} className="rounded bg-black/20 px-[0.4em] py-[0.1em] font-mono text-[0.875em]">
        {m[1]}
      </code>
    )],
    // Spoiler ||text||
    [/\|\|(.+?)\|\|/, (m) => (
      <Spoiler key={k()}>{renderInline(m[1], pfx, kg, onImg)}</Spoiler>
    )],
    // Bold + italic ***text***
    [/\*\*\*(.+?)\*\*\*/, (m) => (
      <strong key={k()}><em>{renderInline(m[1], pfx, kg, onImg)}</em></strong>
    )],
    // Bold **text**
    [/\*\*(.+?)\*\*/, (m) => (
      <strong key={k()}>{renderInline(m[1], pfx, kg, onImg)}</strong>
    )],
    // Underline __text__ (Discord style)
    [/__(.+?)__/, (m) => (
      <u key={k()}>{renderInline(m[1], pfx, kg, onImg)}</u>
    )],
    // Strikethrough ~~text~~
    [/~~(.+?)~~/, (m) => (
      <s key={k()} className="opacity-60">{renderInline(m[1], pfx, kg, onImg)}</s>
    )],
    // Italic *text* or _text_
    [/\*([^*\n]+?)\*|_([^_\n]+?)_/, (m) => (
      <em key={k()}>{renderInline(m[1] ?? m[2], pfx, kg, onImg)}</em>
    )],
    // Image ![alt](url)
    [/!\[([^\]]*)\]\(([^)"'\s]+)(?:\s+"[^"]*")?\)/, (m) => {
      const src = sanitizeUrl(resolveImg(m[2]));
      return (
        <img
          key={k()}
          src={src}
          alt={m[1]}
          className="my-1 max-h-48 max-w-full cursor-zoom-in rounded-lg shadow"
          loading="lazy"
          onClick={() => onImg?.(src)}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      );
    }],
    // Link [text](url)
    [/\[([^\]]+)\]\(([^)]+)\)/, (m) => (
      <a
        key={k()}
        href={sanitizeUrl(m[2])}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {renderInline(m[1], pfx, kg, onImg)}
      </a>
    )],
    // Timestamp @time:unix
    [/@time:(\d+)/, (m) => {
      const d = new Date(parseInt(m[1], 10) * 1000);
      return (
        <time
          key={k()}
          dateTime={d.toISOString()}
          title={d.toUTCString()}
          className="cursor-help rounded bg-primary/10 px-1.5 py-0.5 text-sm underline decoration-dotted"
        >
          {d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
        </time>
      );
    }],
    // Mention @username
    [/@([a-z0-9_]{2,32})/i, (m) => (
      <span
        key={k()}
        className="cursor-pointer rounded bg-primary/15 px-1 py-0.5 font-medium text-primary hover:bg-primary/25 transition-colors"
        data-mention={m[1]}
      >
        @{m[1]}
      </span>
    )],
    // Auto-link
    [/(https?:\/\/[^\s<>"']+)/, (m) => (
      <a
        key={k()}
        href={sanitizeUrl(m[1])}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {m[1]}
      </a>
    )],
  ];

  let segs: (string | React.ReactNode)[] = [text];

  for (const [pat, render] of rules) {
    const next: (string | React.ReactNode)[] = [];
    const re = new RegExp(pat.source, 'g');
    for (const seg of segs) {
      if (typeof seg !== 'string') { next.push(seg); continue; }
      let last = 0;
      let m: RegExpExecArray | null;
      re.lastIndex = 0;
      while ((m = re.exec(seg)) !== null) {
        if (m.index > last) next.push(seg.slice(last, m.index));
        next.push(render(m));
        last = m.index + m[0].length;
        if (m[0].length === 0) re.lastIndex++;
      }
      if (last < seg.length) next.push(seg.slice(last));
    }
    segs = next;
  }

  const out: React.ReactNode[] = [];
  for (const seg of segs) {
    if (typeof seg === 'string') out.push(...twemojify(seg, 20, `${pfx}-tw-${kg.n++}`));
    else out.push(seg);
  }
  return out;
}

// ── Block tokenizer ───────────────────────────────────────────────────────────

type Align = 'left' | 'center' | 'right' | undefined;
type ListRow = { text: string; indent: number };

type BToken =
  | { t: 'h'; level: number; text: string }
  | { t: 'hr' }
  | { t: 'fence'; lang: string; code: string }
  | { t: 'bq'; lines: string[] }
  | { t: 'ul'; items: ListRow[] }
  | { t: 'ol'; items: ListRow[]; start: number }
  | { t: 'table'; heads: string[]; aligns: Align[]; rows: string[][] }
  | { t: 'p'; lines: string[] };

function tokenize(src: string): BToken[] {
  const lines = src.split('\n');
  const out: BToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (!line) { i++; continue; }

    // Heading
    const hm = line.match(/^(#{1,6})\s+(.*?)(?:\s+#+)?$/);
    if (hm) { out.push({ t: 'h', level: hm[1].length, text: hm[2] }); i++; continue; }

    // HR
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) { out.push({ t: 'hr' }); i++; continue; }

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      i++;
      out.push({ t: 'fence', lang, code: code.join('\n') });
      continue;
    }

    // Blockquote
    if (/^\s*>/.test(raw)) {
      const ql: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { ql.push(lines[i].replace(/^\s*>\s?/, '')); i++; }
      out.push({ t: 'bq', lines: ql });
      continue;
    }

    // Table
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s:|\\-]+\|/.test(lines[i + 1].trim())) {
      const parseRow = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const getAlign = (cell: string): Align => {
        const s = cell.trim();
        if (/^:.*:$/.test(s)) return 'center';
        if (/:$/.test(s)) return 'right';
        if (/^:/.test(s)) return 'left';
        return undefined;
      };
      const heads = parseRow(raw);
      const aligns = parseRow(lines[i + 1]).map(getAlign);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(parseRow(lines[i])); i++; }
      out.push({ t: 'table', heads, aligns, rows });
      continue;
    }

    // Unordered list
    if (/^(\s*)[*\-+]\s/.test(raw)) {
      const items: ListRow[] = [];
      while (i < lines.length && /^(\s*)[*\-+]\s/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)[*\-+]\s+(.*)/);
        if (m) items.push({ text: m[2], indent: m[1].length });
        i++;
      }
      out.push({ t: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^(\s*)\d+\.\s/.test(raw)) {
      const sm = raw.match(/^(\s*)(\d+)\.\s/);
      const start = sm ? parseInt(sm[2], 10) : 1;
      const items: ListRow[] = [];
      while (i < lines.length && /^(\s*)\d+\.\s/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
        if (m) items.push({ text: m[2], indent: m[1].length });
        i++;
      }
      out.push({ t: 'ol', items, start });
      continue;
    }

    // Paragraph
    const pl: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,6}\s/.test(lines[i].trim()) &&
      !/^(?:-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('```') &&
      !/^\s*>/.test(lines[i]) &&
      !lines[i].trim().startsWith('|') &&
      !/^(\s*)[*\-+]\s/.test(lines[i]) &&
      !/^(\s*)\d+\.\s/.test(lines[i])
    ) { pl.push(lines[i]); i++; }
    if (pl.length) out.push({ t: 'p', lines: pl });
  }

  return out;
}

// ── Block renderer ─────────────────────────────────────────────────────────────

const H_SIZE   = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs'];
const H_WEIGHT = ['font-bold', 'font-bold', 'font-semibold', 'font-semibold', 'font-medium', 'font-medium'];
const H_MARGIN = ['mt-4 mb-2', 'mt-3 mb-1.5', 'mt-2.5 mb-1', 'mt-2 mb-1', 'mt-1.5 mb-0.5', 'mt-1 mb-0.5'];

function renderBlocks(tokens: BToken[], pfx: string, kg: KG, onImg: (s: string) => void): React.ReactNode[] {
  return tokens.map((tok, idx) => {
    const p = `${pfx}-${idx}`;

    if (tok.t === 'h') {
      const lv = Math.min(tok.level - 1, 5);
      const Tag = HEADING_TAGS[lv];
      return (
        <Tag key={p} className={`${H_SIZE[lv]} ${H_WEIGHT[lv]} ${H_MARGIN[lv]} leading-tight`}>
          {renderInline(tok.text, p, kg, onImg)}
        </Tag>
      );
    }

    if (tok.t === 'hr') return <hr key={p} className="my-3 border-border/30" />;

    if (tok.t === 'fence') return (
      <div key={p} className="my-2 overflow-hidden rounded-xl border border-border/40 bg-muted/30">
        {tok.lang && (
          <div className="border-b border-border/30 bg-muted/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {tok.lang}
          </div>
        )}
        <pre className="overflow-x-auto p-3 text-[0.875em] leading-relaxed">
          <code>{tok.code}</code>
        </pre>
      </div>
    );

    if (tok.t === 'bq') {
      const inner = tokenize(tok.lines.join('\n'));
      return (
        <blockquote key={p} className="my-1.5 rounded-r-lg border-l-4 border-primary/40 bg-primary/5 py-1.5 pl-4 pr-3 text-muted-foreground">
          {renderBlocks(inner, p, kg, onImg)}
        </blockquote>
      );
    }

    if (tok.t === 'ul') return renderList(tok.items, 'ul', undefined, p, kg, onImg);
    if (tok.t === 'ol') return renderList(tok.items, 'ol', tok.start, p, kg, onImg);

    if (tok.t === 'table') return (
      <div key={p} className="my-2 overflow-x-auto rounded-xl border border-border/40">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30">
              {tok.heads.map((h, hi) => (
                <th key={hi} className="px-4 py-2 font-semibold" style={{ textAlign: tok.aligns[hi] ?? 'left' }}>
                  {renderInline(h, `${p}-h${hi}`, kg, onImg)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tok.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/20 last:border-0 even:bg-muted/10 hover:bg-muted/20 transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-foreground/80" style={tok.aligns[ci] ? { textAlign: tok.aligns[ci] } : undefined}>
                    {renderInline(cell, `${p}-c${ri}-${ci}`, kg, onImg)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    if (tok.t === 'p') {
      const nodes: React.ReactNode[] = [];
      tok.lines.forEach((line, li) => {
        const hardBreak = line.endsWith('  ');
        if (li > 0) nodes.push(<br key={`${p}-br${li}`} />);
        nodes.push(...renderInline(line.replace(/  $/, ''), `${p}-l${li}`, kg, onImg));
        if (hardBreak) nodes.push(<br key={`${p}-hb${li}`} />);
      });
      return <p key={p} className="leading-relaxed">{nodes}</p>;
    }

    return null;
  });
}

// ── List renderer ──────────────────────────────────────────────────────────────

function renderList(
  items: ListRow[],
  type: 'ul' | 'ol',
  start: number | undefined,
  pfx: string,
  kg: KG,
  onImg: (s: string) => void,
): React.ReactNode {
  const Tag: React.ElementType = type;
  const cls = type === 'ul' ? 'my-1 list-disc pl-5 space-y-0.5' : 'my-1 list-decimal pl-5 space-y-0.5';
  const base = items[0]?.indent ?? 0;
  const out: React.ReactNode[] = [];
  let i = 0;

  while (i < items.length) {
    const item = items[i];
    if (item.indent > base) { i++; continue; }
    const children: ListRow[] = [];
    let j = i + 1;
    while (j < items.length && items[j].indent > base) { children.push(items[j]); j++; }
    out.push(
      <li key={`${pfx}-${i}`} className="leading-relaxed">
        {renderInline(item.text, `${pfx}-li${i}`, kg, onImg)}
        {children.length > 0 && renderList(children, type, undefined, `${pfx}-s${i}`, kg, onImg)}
      </li>,
    );
    i = j;
  }

  return (
    <Tag key={pfx} className={cls} {...(type === 'ol' && start !== undefined ? { start } : {})}>
      {out}
    </Tag>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const uid = useId();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const onImg = useCallback((src: string) => setLightbox(src), []);

  const trimmed = content.trim();
  const isBareImg =
    /^https?:\/\/\S+\.(gif|png|jpe?g|webp|svg)(\?[^\s]*)?$/i.test(trimmed) ||
    /^https?:\/\/media\d*\.(tenor|giphy)\.com\//i.test(trimmed) ||
    /^\/(uploads|api\/servers|api\/media)\/\S+\.(gif|png|jpe?g|webp|svg)$/i.test(trimmed);

  if (isBareImg) {
    const src = sanitizeUrl(resolveImg(trimmed));
    return (
      <>
        <img
          src={src}
          alt=""
          className="mt-1 max-h-60 max-w-xs cursor-zoom-in rounded-xl shadow"
          loading="lazy"
          onClick={() => setLightbox(src)}
        />
        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </>
    );
  }

  const kg: KG = { n: 0 };
  const tokens = tokenize(content);
  const rendered = renderBlocks(tokens, uid, kg, onImg);

  return (
    <>
      <div className="markdown-body min-w-0 wrap-anywhere leading-relaxed">{rendered}</div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
});
