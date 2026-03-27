/**
 * Safe SVG/HTML sanitization using DOMPurify.
 * Only allows safe SVG elements — strips all script/event attributes.
 * Must be called client-side only (DOMPurify requires a DOM).
 */

import type DOMPurifyType from 'dompurify';

const SVG_CONFIG = {
  ALLOWED_TAGS: [
    'svg', 'path', 'circle', 'rect', 'ellipse', 'line', 'polyline',
    'polygon', 'g', 'defs', 'use', 'symbol', 'title', 'desc',
    'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop',
    'text', 'tspan', 'textPath',
  ],
  ALLOWED_ATTR: [
    'xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke',
    'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'd', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
    'points', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
    'clip-path', 'mask', 'id', 'class', 'style',
    'offset', 'stop-color', 'stop-opacity',
    'gradientUnits', 'gradientTransform', 'spreadMethod',
    'patternUnits', 'patternTransform',
    'xlink:href', 'href',
    'preserveAspectRatio', 'font-size', 'font-family', 'text-anchor',
  ],
  FORCE_BODY: false,
} as const;

type PurifyInstance = typeof DOMPurifyType;
let _purify: PurifyInstance | null = null;

if (typeof window !== 'undefined') {
  import('dompurify').then((m) => {
    // DOMPurify ESM exports the purify object itself as the module
    _purify = m as unknown as PurifyInstance;
  });
}

/**
 * Sanitizes an SVG/HTML string for safe injection via dangerouslySetInnerHTML.
 * Returns an empty string if called server-side or if the input is empty.
 */
export function sanitizeSvg(input: string | undefined | null): string {
  if (!input) return '';
  if (typeof window === 'undefined') return ''; // SSR — never inject untrusted HTML server-side
  if (!_purify) return ''; // DOMPurify not yet loaded
  return (_purify as any).sanitize(input, SVG_CONFIG);
}
