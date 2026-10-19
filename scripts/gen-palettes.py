"""
Générateur des palettes AlfyChat (globals.css + palettes.ts).

Une échelle de luminosité commune (par couche d'interface), une teinte et une
chroma par palette, des contrastes WCAG vérifiés. Toute palette dont un
contraste échoue fait échouer le script : rien n'est écrit.
"""
import io, math, re, sys

import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, 'src', 'app', 'globals.css')
TS = os.path.join(ROOT, 'src', 'components', 'atelier', 'theme', 'palettes.ts')

# ── Couleur : oklch → sRGB → luminance relative ─────────────────────────────
def oklch_to_srgb(L, C, h):
    L = L / 100.0
    a = C * math.cos(math.radians(h)); b = C * math.sin(math.radians(h))
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
    return [min(1, max(0, c)) for c in (r, g, bb)]  # linéaire, borné au gamut

def lum(col):
    r, g, b = oklch_to_srgb(*col)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(c1, c2):
    a, b = lum(c1), lum(c2)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)

def fmt(c):
    L, C, h = c
    return f'oklch({L:.2f}% {C:.4f} {h:g})'

# ── Échelles par couche ──────────────────────────────────────────────────────
# (luminosité %, facteur de chroma) — le facteur module la chroma « neutre »
# de la palette : les fonds la portent pleinement, le texte presque pas.
DARK = {
    'background':         (13.5, 1.00),  # rail, fond le plus profond
    'field-background':   (16.0, 1.00),
    'surface':            (19.5, 1.00),  # fil de discussion
    'overlay':            (21.5, 1.05),  # menus, popovers, dialogues
    'surface-secondary':  (23.0, 1.05),
    'surface-tertiary':   (26.0, 1.10),
    'default':            (28.0, 1.10),
    'separator':          (25.5, 1.00),
    'border':             (31.5, 1.15),  # bordures VISIBLES
    'segment':            (35.0, 1.10),
    'scrollbar':          (44.0, 0.90),
    'muted':              (71.5, 0.70),
    'field-placeholder':  (64.0, 0.70),
    'foreground':         (96.5, 0.35),
    'field-foreground':   (96.5, 0.35),
    'surface-foreground': (96.5, 0.35),
    'overlay-foreground': (96.5, 0.35),
    'segment-foreground': (96.5, 0.35),
    'default-foreground': (96.5, 0.35),
    'surface-secondary-foreground': (96.5, 0.35),
    'surface-tertiary-foreground':  (96.5, 0.35),
}
LIGHT = {
    'background':         (94.8, 1.00),  # rail plus soutenu que le fil
    'field-background':   (100.0, 0.30),
    'surface':            (99.5, 0.45),  # fil
    'overlay':            (100.0, 0.30),
    'surface-secondary':  (96.8, 0.85),
    'surface-tertiary':   (94.6, 1.00),
    'default':            (93.4, 1.00),
    'separator':          (91.2, 1.00),
    'border':             (87.4, 1.20),
    'segment':            (100.0, 0.30),
    'scrollbar':          (81.0, 1.00),
    'muted':              (49.0, 1.40),
    'field-placeholder':  (56.0, 1.20),
    'foreground':         (20.5, 1.10),
    'field-foreground':   (20.5, 1.10),
    'surface-foreground': (20.5, 1.10),
    'overlay-foreground': (20.5, 1.10),
    'segment-foreground': (20.5, 1.10),
    'default-foreground': (20.5, 1.10),
    'surface-secondary-foreground': (20.5, 1.10),
    'surface-tertiary-foreground':  (20.5, 1.10),
}
# Nocturne : le sombre glisse vers le noir absolu (OLED).
OLED_SHIFT = {'background': 0.0, 'field-background': 8.0, 'surface': 9.5, 'overlay': 11.5, 'surface-secondary': 13.0,
              'surface-tertiary': 16.0, 'default': 18.0, 'separator': 16.5, 'border': 25.5, 'segment': 30.0}

# ── Palettes ─────────────────────────────────────────────────────────────────
# hue, chroma neutre (sombre, clair), accent sombre (L, C, H), accent clair (L, C, H)
PALETTES = [
    dict(id='alfy',     nom='Alfy',     desc="L'identité d'origine, violet électrique",
         hue=282, c=(0.016, 0.0075), acc_dark=(62.0, 0.215, 284), acc_light=(53.0, 0.245, 285)),
    dict(id='encre',    nom='Encre',    desc='Graphite pur, contraste maximal',
         hue=0, c=(0.0, 0.0), acc_dark=(95.0, 0.0, 0), acc_light=(22.0, 0.0, 0)),
    dict(id='sable',    nom='Sable',    desc='Papier chaud, cognac',
         hue=72, c=(0.017, 0.020), acc_dark=(76.0, 0.135, 68), acc_light=(49.0, 0.120, 52)),
    dict(id='abysse',   nom='Abysse',   desc='Bleu océan profond',
         hue=245, c=(0.032, 0.013), acc_dark=(70.0, 0.150, 236), acc_light=(50.0, 0.180, 248)),
    dict(id='menthe',   nom='Menthe',   desc='Vert frais',
         hue=170, c=(0.022, 0.012), acc_dark=(77.0, 0.155, 162), acc_light=(47.0, 0.125, 166)),
    dict(id='braise',   nom='Braise',   desc='Orange brûlé',
         hue=44, c=(0.020, 0.014), acc_dark=(71.0, 0.180, 44), acc_light=(54.0, 0.190, 38)),
    dict(id='orchidee', nom='Orchidée', desc='Magenta feutré',
         hue=338, c=(0.026, 0.013), acc_dark=(70.0, 0.195, 346), acc_light=(52.0, 0.225, 346)),
    dict(id='nocturne', nom='Nocturne', desc="Noir absolu, pensé pour l'OLED",
         hue=290, c=(0.010, 0.0030), acc_dark=(62.0, 0.240, 292), acc_light=(51.0, 0.265, 292), oled=True),
]

WHITE = (99.4, 0.0, 0); INK = (17.0, 0.0, 0)

def accent_fg(acc):
    """Texte posé sur l'accent : blanc ou encre, le plus contrasté (≥ 4.5 exigé)."""
    w, k = contrast(acc, WHITE), contrast(acc, INK)
    if max(w, k) < 4.5:
        raise SystemExit(f'accent {fmt(acc)} : aucun texte lisible (blanc {w:.2f}, encre {k:.2f})')
    return (WHITE if w >= k else (INK[0], min(acc[1] * 0.25, 0.04), acc[2]))

def build(p, mode):
    ladder = DARK if mode == 'dark' else LIGHT
    c_neutral = p['c'][0] if mode == 'dark' else p['c'][1]
    out = {}
    for k, (L, f) in ladder.items():
        if mode == 'dark' and p.get('oled') and k in OLED_SHIFT:
            L = OLED_SHIFT[k]
        out[k] = (L, round(c_neutral * f, 4), p['hue'])
    acc = p['acc_dark'] if mode == 'dark' else p['acc_light']
    out['accent'] = acc
    out['accent-foreground'] = accent_fg(acc)
    out['focus'] = acc
    return out

def check(p, mode, v):
    fails = []
    def need(a, b, minimum, label):
        r = contrast(v[a], v[b])
        if r < minimum:
            fails.append(f'{label} {r:.2f} < {minimum}')
    for surf in ('surface', 'background', 'overlay', 'surface-secondary'):
        need('foreground', surf, 12.0, f'texte/{surf}')
        need('muted', surf, 4.5, f'secondaire/{surf}')
    need('field-foreground', 'field-background', 12.0, 'saisie')
    need('field-placeholder', 'field-background', 3.0, 'indication')
    need('accent-foreground', 'accent', 4.5, 'texte/accent')
    need('border', 'surface', 1.25, 'bordure/fil')
    need('accent', 'surface', 3.0, 'accent/fil')
    if fails:
        raise SystemExit(f"palette {p['id']} ({mode}) : " + ' ; '.join(fails))
    return {
        'texte': contrast(v['foreground'], v['surface']),
        'secondaire': contrast(v['muted'], v['surface']),
        'accent': contrast(v['accent-foreground'], v['accent']),
        'bordure': contrast(v['border'], v['surface']),
    }

ORDER = ['accent', 'accent-foreground', 'focus', 'background', 'surface', 'surface-foreground',
         'surface-secondary', 'surface-secondary-foreground', 'surface-tertiary', 'surface-tertiary-foreground',
         'overlay', 'overlay-foreground', 'default', 'default-foreground', 'field-background', 'field-foreground',
         'field-placeholder', 'separator', 'border', 'segment', 'segment-foreground', 'scrollbar', 'muted', 'foreground']

def block(selector, v, extra=''):
    lines = [f'{selector} {{']
    if extra:
        lines.append(extra)
    for k in ORDER:
        lines.append(f'  --{k}: {fmt(v[k])};')
    lines.append('}')
    return '\n'.join(lines)

# Couleurs sémantiques et de statut — communes à toutes les palettes.
SEMANTIC_LIGHT = """  --success: oklch(57.00% 0.1550 150); --success-foreground: oklch(99.40% 0 0);
  --warning: oklch(72.00% 0.1600 68);  --warning-foreground: oklch(20.00% 0.0400 68);
  --danger: oklch(55.50% 0.2150 26);   --danger-foreground: oklch(99.40% 0 0);
  --field-border: transparent;
  /* Statuts de présence : une seule source, lue par StatusDot et les badges. */
  --status-online: oklch(62.00% 0.1700 150);
  --status-idle: oklch(76.00% 0.1600 72);
  --status-dnd: oklch(58.00% 0.2200 25);
  --status-offline: oklch(64.00% 0.0120 270);
  --status-streaming: oklch(55.00% 0.2300 300);"""
SEMANTIC_DARK = """  --success: oklch(72.00% 0.1700 152); --success-foreground: oklch(18.00% 0.0400 152);
  --warning: oklch(81.00% 0.1500 78);  --warning-foreground: oklch(19.00% 0.0400 78);
  --danger: oklch(64.00% 0.2050 25);   --danger-foreground: oklch(99.40% 0 0);
  --field-border: transparent;
  --status-online: oklch(72.00% 0.1800 152);
  --status-idle: oklch(80.00% 0.1550 76);
  --status-dnd: oklch(64.00% 0.2150 25);
  --status-offline: oklch(60.00% 0.0120 270);
  --status-streaming: oklch(62.00% 0.2200 300);"""

ACCENTS = [  # data-accent — surcharge accent + focus seuls
    ('alfy',   (58.0, 0.235, 286)),
    ('bleu',   (55.0, 0.195, 254)),
    ('menthe', (66.0, 0.150, 164)),
    ('ambre',  (77.0, 0.155, 76)),
    ('corail', (61.0, 0.195, 30)),
    ('rose',   (56.5, 0.215, 354)),
]

report = []
css_blocks = []
swatches = {}
for p in PALETTES:
    light, dark = build(p, 'light'), build(p, 'dark')
    rl, rd = check(p, 'light', light), check(p, 'dark', dark)
    report.append((p['id'], rl, rd))
    swatches[p['id']] = (light, dark)
    if p['id'] == 'alfy':
        css_blocks.append('/* ── Palette par défaut : Alfy ─────────────────────────────────────────── */')
        css_blocks.append(block(':root,\n.light,\n.default,\n[data-theme="light"],\n[data-theme="default"]', light,
                                SEMANTIC_LIGHT + '\n  --radius: 0.25rem;\n  --field-radius: 0.75rem;\n  --font-sans: var(--font-inter);'))
        css_blocks.append(block('.dark,\n[data-theme="dark"]', dark, '  color-scheme: dark;\n' + SEMANTIC_DARK))
    else:
        css_blocks.append(f"/* {p['nom']} — {p['desc']} */")
        css_blocks.append(block(f":root[data-palette=\"{p['id']}\"]", light))
        css_blocks.append(block(f".dark[data-palette=\"{p['id']}\"], [data-theme=\"dark\"][data-palette=\"{p['id']}\"]", dark))

acc_lines = []
for name, acc in ACCENTS:
    fg = accent_fg(acc)
    acc_lines.append(f':root[data-accent="{name}"] {{\n  --accent: {fmt(acc)};\n  --accent-foreground: {fmt(fg)};\n  --focus: {fmt(acc)};\n}}')

HEADER = """/* ════════════════════════════════════════════════════════════════════════
 * Thème AlfyChat v3 — couleurs refaites de zéro, générées.
 *
 *   Mode    : clair / sombre / auto        → next-themes (class + data-theme)
 *   Palette : data-palette="…" sur <html>  → blocs ci-dessous
 *   Accent  : data-accent="…" sur <html>   → surcharge --accent/--focus seuls
 *
 * Une même échelle de luminosité pour toutes les palettes, par couche :
 *   sombre : rail 13.5 < saisie 16 < fil 19.5 < menus 21.5 < cartes 23 < 26 < bordures 31.5
 *   clair  : rail 94.8 < cartes 96.8 < fil 99.5 < menus 100 ; bordures 87.4
 * Chaque palette n'apporte qu'une teinte, une chroma neutre et son accent.
 * Contrastes vérifiés à la génération (texte ≥ 12:1, secondaire ≥ 4.5:1,
 * texte sur accent ≥ 4.5:1). NE PAS retoucher à la main : relancer
 * `python scripts/gen-palettes.py` (aperçus de palettes.ts régénérés aussi).
 * ════════════════════════════════════════════════════════════════════════ */"""

DEPTH = """/* ── Profondeur du thème sombre (data-depth sur <html>) ───────────────────
 * Composable avec n'importe quelle palette : ne touche qu'aux fonds.
 * Déclaré APRÈS les palettes pour gagner à spécificité égale.
 * ─────────────────────────────────────────────────────────────────────── */
.dark[data-depth="deep"], [data-theme="dark"][data-depth="deep"] {
  --background: oklch(from var(--surface) calc(l - 0.09) c h);
  --surface: oklch(from var(--surface) calc(l - 0.045) c h);
  --field-background: oklch(from var(--field-background) calc(l - 0.045) c h);
}
.dark[data-depth="oled"], [data-theme="dark"][data-depth="oled"] {
  --background: oklch(0% 0 0);
  --surface: oklch(from var(--surface) calc(l - 0.08) c h);
  --surface-secondary: oklch(from var(--surface-secondary) calc(l - 0.07) c h);
  --field-background: oklch(from var(--field-background) calc(l - 0.075) c h);
  --separator: oklch(from var(--separator) calc(l - 0.04) c h);
}

/* ── Accents découplés — surchargent uniquement accent + focus ────────────
 * `:root[data-accent]` (0,2,0) est déclaré APRÈS les blocs palettes pour
 * gagner à spécificité égale contre `.dark[data-palette]`. Ne pas déplacer.
 * ─────────────────────────────────────────────────────────────────────── */"""

region = '\n'.join([HEADER, '', '\n\n'.join(css_blocks), '', DEPTH, '\n'.join(acc_lines), ''])

s = io.open(CSS, encoding='utf-8').read()
crlf = '\r\n' in s
if crlf:
    s = s.replace('\r\n', '\n')
start = s.index('/* ════════════════════════════════════════════════════════════════════════\n * Thème AlfyChat v3')
end = s.index('/* ───────────────────────────────────────────────────────────\n * Utilitaires custom mappés sur le thème.')
s = s[:start] + region + '\n' + s[end:]
# Présence : jetons dédiés (au lieu de success/warning/danger/muted).
s = s.replace("""  /* Présence — dérivée des vars sémantiques */
  --color-online:      var(--success);
  --color-away:        var(--warning);
  --color-dnd:         var(--danger);
  --color-offline:     var(--muted);""", """  /* Présence — jetons dédiés (--status-*), déclinés par mode */
  --color-online:      var(--status-online);
  --color-away:        var(--status-idle);
  --color-idle:        var(--status-idle);
  --color-dnd:         var(--status-dnd);
  --color-offline:     var(--status-offline);
  --color-streaming:   var(--status-streaming);""")
if crlf:
    s = s.replace('\n', '\r\n')

# ── palettes.ts : aperçus régénérés depuis les mêmes valeurs ─────────────────
t = io.open(TS, encoding='utf-8').read()
tcrlf = '\r\n' in t
if tcrlf:
    t = t.replace('\r\n', '\n')
def swatch_ts(v):
    short = lambda c: f"oklch({c[0]:g}% {c[1]:g} {c[2]:g})"
    return f"{{\n        background: '{short(v['background'])}',\n        surface: '{short(v['surface'])}',\n        accent: '{short(v['accent'])}',\n      }}"
for p in PALETTES:
    light, dark = swatches[p['id']]
    pat = re.compile(r"(id: '" + p['id'] + r"',\n    nom: )'[^']*',\n    description: '[^']*',\n    swatch: \{\n      light: \{[^}]*\},\n      dark: \{[^}]*\},\n    \},", re.S)
    nom = p['nom'].replace("'", "\\'"); desc = p['desc'].replace("'", "’")
    new = (f"id: '{p['id']}',\n    nom: '{nom}',\n    description: '{desc}',\n    swatch: {{\n      light: {swatch_ts(light)},\n      dark: {swatch_ts(dark)},\n    }},")
    t, n = pat.subn(lambda m: new, t)
    if n != 1:
        raise SystemExit(f'palettes.ts : palette {p["id"]} introuvable ({n})')
if tcrlf:
    t = t.replace('\n', '\r\n')

io.open(CSS, 'w', encoding='utf-8', newline='').write(s)
io.open(TS, 'w', encoding='utf-8', newline='').write(t)

print(f"{'palette':10} | {'clair texte/sec/accent/bord':30} | sombre texte/sec/accent/bord")
for pid, rl, rd in report:
    f = lambda r: f"{r['texte']:5.1f} {r['secondaire']:4.1f} {r['accent']:4.1f} {r['bordure']:4.2f}"
    print(f'{pid:10} | {f(rl):30} | {f(rd)}')
for name, acc in ACCENTS:
    print(f'accent {name:7} texte/accent {contrast(accent_fg(acc), acc):4.1f}')
print('écrit :', CSS, TS)
