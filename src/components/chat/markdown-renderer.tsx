'use client';

import React, { useId, useState } from 'react';
import { twemojify } from '@/lib/twemoji';
import { resolveMediaUrl } from '@/lib/api';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Full Discord-style markdown renderer.
 * Supports: # headings, **bold**, *italic*, __underline__, ~~strikethrough~~,
 * `inline code`, ```code blocks```, [links](url), > blockquotes,
 * - unordered lists, 1. ordered lists, ![images](url), ||spoilers||
 * All emoji rendered as Twitter emoji (Twemoji).
 */
export const MarkdownRenderer = React.memo(function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const uid = useId();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      setLightboxSrc((target as HTMLImageElement).src);
    }
  };

  const lightbox = lightboxSrc ? (
    <div
      className="fixed inset-0 z-[9999] flex cursor-zoom-out items-center justify-center bg-black/80"
      onClick={() => setLightboxSrc(null)}
      onKeyDown={(e) => e.key === 'Escape' && setLightboxSrc(null)}
      role="dialog"
      aria-modal
    >
      <button
        className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        onClick={(e) => { e.stopPropagation(); setLightboxSrc(null); }}
        aria-label="Fermer"
      >
        <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
      <img
        src={lightboxSrc}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  ) : null;

  // Si le contenu est uniquement une URL d'image/GIF, l'afficher directement
  const trimmed = content.trim();
  const isExternalImage = /^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i.test(trimmed) ||
    /^https?:\/\/media\d*\.(tenor|giphy)\.com\//i.test(trimmed);
  const isLocalUpload = /^\/uploads\/\S+\.(gif|png|jpe?g|webp)$/i.test(trimmed);
  const isServerFile = /^\/api\/servers\/[^/]+\/files\/\S+\.(gif|png|jpe?g|webp)$/i.test(trimmed);
  if (isExternalImage || isLocalUpload || isServerFile) {
    const src = ((isLocalUpload || isServerFile) ? resolveMediaUrl(trimmed) : trimmed) ?? trimmed;
    return (
      <>
        <img
          src={src} alt=""
          className="max-h-60 max-w-xs cursor-zoom-in rounded-xl shadow-sm"
          loading="lazy"
          onClick={() => setLightboxSrc(src)}
        />
        {lightbox}
      </>
    );
  }

  const elements = parseMarkdown(content, uid);
  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="whitespace-pre-wrap wrap-break-word" onClick={handleClick}>{elements}</div>
      {lightbox}
    </>
  );
});

// ── Top-level parser: split by code blocks ──

function parseMarkdown(text: string, uid: string): React.ReactNode[] {
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...parseBlocks(text.slice(lastIndex, match.index), `${uid}-pre-${match.index}`));
    }

    const lang = match[1];
    const code = match[2].trimEnd();
    parts.push(
      <pre
        key={`${uid}-cb-${match.index}`}
        className="my-1.5 overflow-x-auto rounded-xl border border-[var(--border)]/40 bg-[var(--surface-secondary)]/20 p-3 text-sm"
      >
        {lang && (
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]/70">{lang}</span>
        )}
        <code className="text-[var(--foreground)]/90">{code}</code>
      </pre>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(...parseBlocks(text.slice(lastIndex), `${uid}-post-${lastIndex}`));
  }

  return parts.length > 0 ? parts : [text];
}

// ── Block-level parser: headings, blockquotes, lists, paragraphs ──

function parseBlocks(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const results: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → line break
    if (line.trim() === '') {
      if (i > 0) results.push(<br key={`${keyPrefix}-br-${i}`} />);
      i++;
      continue;
    }

    // Headings: # h1 ... ###### h6
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2];
      const headingClasses: Record<number, string> = {
        1: 'text-2xl font-bold mt-2 mb-1',
        2: 'text-xl font-bold mt-2 mb-1',
        3: 'text-lg font-semibold mt-1.5 mb-0.5',
        4: 'text-base font-semibold mt-1 mb-0.5',
        5: 'text-sm font-semibold mt-1',
        6: 'text-sm font-medium mt-1 text-[var(--muted)]',
      };
      results.push(
        <div key={`${keyPrefix}-h-${i}`} className={headingClasses[level]}>
          {formatInline(headingContent, `${keyPrefix}-h-${i}`)}
        </div>
      );
      i++;
      continue;
    }

    // Blockquote: > text (can be multi-line)
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      results.push(
        <div
          key={`${keyPrefix}-bq-${i}`}
          className="my-1.5 rounded-lg border-l-4 border-[var(--accent)]/40 bg-[var(--surface-secondary)]/10 py-1 pl-3 pr-2 text-[var(--muted)]"
        >
          {quoteLines.map((ql, qi) => (
            <React.Fragment key={qi}>
              {qi > 0 && <br />}
              {formatInline(ql, `${keyPrefix}-bq-${i}-${qi}`)}
            </React.Fragment>
          ))}
        </div>
      );
      continue;
    }

    // Unordered list: * item or - item or + item
    if (/^(\s*)[*\-+]\s+/.test(line)) {
      const listItems: { content: string; indent: number }[] = [];
      while (i < lines.length && /^(\s*)[*\-+]\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)[*\-+]\s+(.*)/);
        if (m) {
          listItems.push({ content: m[2], indent: m[1].length });
        }
        i++;
      }
      results.push(renderUnorderedList(listItems, `${keyPrefix}-ul-${i}`));
      continue;
    }

    // Ordered list: 1. item
    if (/^(\s*)\d+\.\s+/.test(line)) {
      const listItems: { content: string; indent: number }[] = [];
      while (i < lines.length && /^(\s*)\d+\.\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)/);
        if (m) {
          listItems.push({ content: m[2], indent: m[1].length });
        }
        i++;
      }
      results.push(renderOrderedList(listItems, `${keyPrefix}-ol-${i}`));
      continue;
    }

    // Horizontal rule: --- or *** or ___
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      results.push(
        <hr key={`${keyPrefix}-hr-${i}`} className="my-2 border-[var(--border)]/40" />
      );
      i++;
      continue;
    }

    // Normal line
    results.push(
      <React.Fragment key={`${keyPrefix}-l-${i}`}>
        {i > 0 && results.length > 0 && <br />}
        {formatInline(line, `${keyPrefix}-l-${i}`)}
      </React.Fragment>
    );
    i++;
  }

  return results;
}

// ── List renderers ──

function renderUnorderedList(
  items: { content: string; indent: number }[],
  keyPrefix: string
): React.ReactNode {
  return (
    <ul key={keyPrefix} className="my-1 list-inside list-disc space-y-0.5 pl-2">
      {items.map((item, idx) => (
        <li
          key={`${keyPrefix}-${idx}`}
          className="text-[var(--foreground)]/90"
          style={{ paddingLeft: item.indent > 0 ? `${item.indent * 8}px` : undefined }}
        >
          {formatInline(item.content, `${keyPrefix}-${idx}`)}
        </li>
      ))}
    </ul>
  );
}

function renderOrderedList(
  items: { content: string; indent: number }[],
  keyPrefix: string
): React.ReactNode {
  return (
    <ol key={keyPrefix} className="my-1 list-inside list-decimal space-y-0.5 pl-2">
      {items.map((item, idx) => (
        <li
          key={`${keyPrefix}-${idx}`}
          className="text-[var(--foreground)]/90"
          style={{ paddingLeft: item.indent > 0 ? `${item.indent * 8}px` : undefined }}
        >
          {formatInline(item.content, `${keyPrefix}-${idx}`)}
        </li>
      ))}
    </ol>
  );
}

// ── Inline formatting ──

function formatInline(text: string, keyPrefix: string): React.ReactNode[] {
  let keyCounter = 0;
  const patterns: [RegExp, (match: RegExpMatchArray, key: string) => React.ReactNode][] = [
    // Timestamps: @time:1713100000
    [
      /@time:(\d+)/g,
      (m, k) => {
        const ts = parseInt(m[1], 10);
        const date = new Date(ts * 1000);
        const local = date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        const utc = date.toUTCString();
        return (
          <time
            key={k}
            dateTime={date.toISOString()}
            title={utc}
            className="cursor-help rounded bg-[var(--surface-secondary)]/40 px-1.5 py-0.5 font-medium text-[var(--foreground)] underline decoration-dotted"
          >
            {local}
          </time>
        );
      },
    ],
    // Mentions: @username
    [
      /@([a-z0-9_]{2,32})/gi,
      (m, k) => (
        <span
          key={k}
          className="inline-flex items-center rounded bg-[var(--accent)]/15 px-1 py-0.5 text-[var(--accent)] font-medium cursor-pointer hover:bg-[var(--accent)]/25 transition-colors"
          data-mention={m[1]}
        >
          @{m[1]}
        </span>
      ),
    ],
    // Images: ![alt](url)
    [
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      (m, k) => (
        <img
          key={k}
          src={resolveMediaUrl(m[2]) || m[2]}
          alt={m[1]}
          className="my-1 inline-block max-h-60 max-w-xs cursor-zoom-in rounded-xl shadow-sm"
          loading="lazy"
        />
      ),
    ],
    // Inline code: `code`
    [
      /`([^`]+)`/g,
      (m, k) => (
        <code key={k} className="rounded-md bg-[var(--surface-secondary)]/40 px-1.5 py-0.5 text-[0.85em] font-mono">
          {m[1]}
        </code>
      ),
    ],
    // Spoiler: ||text||
    [
      /\|\|(.+?)\|\|/g,
      (m, k) => <Spoiler key={k}>{m[1]}</Spoiler>,
    ],
    // Bold + Italic: ***text***
    [
      /\*\*\*(.+?)\*\*\*/g,
      (m, k) => (
        <strong key={k} className="font-bold">
          <em>{m[1]}</em>
        </strong>
      ),
    ],
    // Bold: **text**
    [
      /\*\*(.+?)\*\*/g,
      (m, k) => (
        <strong key={k} className="font-bold">
          {m[1]}
        </strong>
      ),
    ],
    // Underline: __text__
    [
      /__(.+?)__/g,
      (m, k) => <u key={k}>{m[1]}</u>,
    ],
    // Strikethrough: ~~text~~
    [
      /~~(.+?)~~/g,
      (m, k) => (
        <s key={k} className="text-[var(--muted)] line-through">
          {m[1]}
        </s>
      ),
    ],
    // Italic: *text*
    [
      /\*(.+?)\*/g,
      (m, k) => <em key={k}>{m[1]}</em>,
    ],
    // Italic: _text_
    [
      /_(.+?)_/g,
      (m, k) => <em key={k}>{m[1]}</em>,
    ],
    // Links: [text](url)
    [
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (m, k) => (
        <a
          key={k}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]"
        >
          {m[1]}
        </a>
      ),
    ],
    // Auto-link URLs
    [
      /(https?:\/\/[^\s<]+)/g,
      (m, k) => (
        <a
          key={k}
          href={m[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] underline decoration-[var(--accent)]/40 hover:decoration-[var(--accent)]"
        >
          {m[1]}
        </a>
      ),
    ],
  ];

  let nodes: React.ReactNode[] = [text];

  patterns.forEach(([regex, render]) => {
    const newNodes: React.ReactNode[] = [];

    nodes.forEach((node) => {
      if (typeof node !== 'string') {
        newNodes.push(node);
        return;
      }

      const str = node;
      let lastIdx = 0;
      let m: RegExpExecArray | null;
      const r = new RegExp(regex.source, regex.flags);

      while ((m = r.exec(str)) !== null) {
        if (m.index > lastIdx) {
          newNodes.push(str.slice(lastIdx, m.index));
        }
        newNodes.push(render(m, `${keyPrefix}-${keyCounter++}`));
        lastIdx = m.index + m[0].length;
      }

      if (lastIdx < str.length) {
        newNodes.push(str.slice(lastIdx));
      }
    });

    nodes = newNodes;
  });

  // Final pass: convert emoji characters to Twemoji in remaining text nodes
  const twemojified: React.ReactNode[] = [];
  nodes.forEach((node) => {
    if (typeof node === 'string') {
      twemojified.push(...twemojify(node, 20, `${keyPrefix}-tw-${keyCounter++}`));
    } else {
      twemojified.push(node);
    }
  });

  return twemojified;
}

// ── Spoiler component ──

function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = React.useState(false);
  return (
    <span
      className={`cursor-pointer rounded-lg px-1 transition-all duration-200 ${
        revealed ? 'bg-[var(--surface-secondary)]/40 text-[var(--foreground)]' : 'bg-[var(--surface-secondary)] text-transparent'
      }`}
      onClick={() => setRevealed((v) => !v)}
    >
      {children}
    </span>
  );
}
