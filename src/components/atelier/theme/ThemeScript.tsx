/**
 * Atelier ThemeKit — script anti-flash.
 *
 * Inséré dans <head> (Server Component compatible) : lit l'état persisté
 * et pose data-palette / data-accent + les variables inline custom AVANT
 * le premier paint, pour que la palette choisie n'apparaisse jamais en
 * retard sur le thème par défaut.
 *
 * next-themes gère lui-même la classe .dark / data-theme via son propre
 * script ; ici on ne touche qu'aux axes palette et accent.
 */

const THEME_SCRIPT = `(function () {
  try {
    var raw = localStorage.getItem('alfychat.themekit.v1');
    if (!raw) return;
    var s = JSON.parse(raw);
    var d = document.documentElement;
    if (s.palette && s.palette !== 'alfy') d.setAttribute('data-palette', s.palette);
    if (s.accent && s.accent !== 'auto') d.setAttribute('data-accent', s.accent);
    if (s.accent === 'custom' && s.accentCustom) {
      d.style.setProperty('--accent', s.accentCustom.oklch);
      d.style.setProperty('--accent-foreground', s.accentCustom.fg);
      d.style.setProperty('--focus', s.accentCustom.oklch);
    }
    if (s.palette === 'custom' && s.custom) {
      var t = localStorage.getItem('theme') || 'dark';
      var m = t === 'system'
        ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : t;
      var vars = s.custom[m] || {};
      for (var k in vars) d.style.setProperty(k, vars[k]);
    }
  } catch (e) {}
})();
(function () {
  try {
    var raw = localStorage.getItem('alfychat_app_prefs');
    if (!raw) return;
    var p = JSON.parse(raw);
    var d = document.documentElement;
    if (p.themePreset === 'deep' || p.themePreset === 'oled') d.setAttribute('data-depth', p.themePreset);
    if (typeof p.saturation === 'number' && p.saturation !== 100) {
      d.style.setProperty('--a11y-saturation', String(p.saturation / 100));
      d.setAttribute('data-saturation', 'on');
    }
    if (typeof p.fontScale === 'number') d.style.setProperty('--font-scale', String(p.fontScale / 100));
    if (p.highContrast) d.setAttribute('data-contrast', 'high');
    if (p.reducedMotion) d.setAttribute('data-motion', 'reduced');
    if (p.messageDisplay) d.setAttribute('data-msg-display', p.messageDisplay);
  } catch (e) {}
})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
