'use client';

import React from 'react';

/**
 * Converts emoji characters in text to Twitter emoji (Twemoji) images.
 * Uses the jdecked/twemoji CDN (maintained fork).
 */

const TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/';

/**
 * Convert a single emoji string to its Twemoji image URL.
 */
export function emojiToTwemojiUrl(emoji: string): string {
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)!.toString(16))
    .filter((cp) => cp !== 'fe0f') // Remove variation selector
    .join('-');
  return `${TWEMOJI_BASE}${codePoints}.png`;
}

/**
 * Render a single emoji as a Twemoji image element.
 */
export function Twemoji({
  emoji,
  size = 20,
  className = '',
}: {
  emoji: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={emojiToTwemojiUrl(emoji)}
      alt={emoji}
      draggable={false}
      className={`inline-block align-text-bottom ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// Regex matching most emoji characters (simplified but covers common emoji)
const EMOJI_REGEX =
  /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?)/gu;

/**
 * Replace all emoji characters in a string with Twemoji <img> elements.
 * Returns an array of React nodes (strings and img elements).
 */
export function twemojify(text: string, size = 20, keyPrefix = 'tw'): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags);

  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(text)) !== null) {
    // Skip single digit characters like 0-9 that match emoji regex
    if (/^[0-9#*]$/.test(match[0])) continue;

    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <Twemoji key={`${keyPrefix}-${match.index}`} emoji={match[0]} size={size} />
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
