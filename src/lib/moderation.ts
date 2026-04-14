const BAD_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'nigger', 'nigga', 'faggot', 'retard',
  'putain', 'merde', 'salope', 'connard', 'enculé', 'encule', 'pute', 'pd', 'bite', 'chatte', 'nique', 'niquer', 'tapette', 'batard', 'bâtard', 'fdp',
  'cazzo', 'stronzo', 'puta', 'mierda', 'scheisse', 'scheiße',
];

const NORMALIZE_MAP: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i' };

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0134579@$!]/g, (c) => NORMALIZE_MAP[c] || c)
    .replace(/[^a-z]/g, '');
}

export function containsProfanity(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  return BAD_WORDS.some((w) => n.includes(w));
}

export function sanitizeText(text: string): string {
  let out = text;
  for (const w of BAD_WORDS) {
    const re = new RegExp(w, 'gi');
    out = out.replace(re, (m) => '*'.repeat(m.length));
  }
  return out;
}
