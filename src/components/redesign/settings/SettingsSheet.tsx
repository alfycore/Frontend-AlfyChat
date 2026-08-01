"use client";

import { useState, useCallback } from "react";
import { Button, Avatar, Switch } from "@heroui/react";
import {
  X, User, Palette, Bell, Shield, LogOut,
  Camera, Edit3, Check, Mail, Phone, Lock, Eye, EyeOff,
  Monitor, Sun, Moon, Sliders, PanelLeft, PanelTop,
} from "lucide-react";
import { CURRENT_USER } from "@/lib/mock-data";
import { PresenceDot } from "@/components/redesign/ui/PresenceDot";
import type { NavOrientation } from "@/components/redesign/nav/NavRail";

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
  orientation?: NavOrientation;
  onSetOrientation?: (o: NavOrientation) => void;
}

/* ─── Nav structure ─────────────────────────────────────────── */
type TabId =
  | "account" | "profile" | "privacy"
  | "appearance" | "notifications" | "accessibility"
  | "developer";

interface NavSection {
  label: string;
  items: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[];
}

const NAV: NavSection[] = [
  {
    label: "Mon compte",
    items: [
      { id: "account", label: "Compte", icon: User },
      { id: "profile", label: "Profil", icon: Edit3 },
      { id: "privacy", label: "Confidentialité", icon: Shield },
    ],
  },
  {
    label: "Application",
    items: [
      { id: "appearance", label: "Apparence", icon: Palette },
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "accessibility", label: "Accessibilité", icon: Sliders },
    ],
  },
  {
    label: "Avancé",
    items: [
      { id: "developer", label: "Développeur", icon: Monitor },
    ],
  },
];

/* ─── Shared field ──────────────────────────────────────────── */
function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted/60">{hint}</p>}
    </div>
  );
}

function TextInput({
  defaultValue, type = "text", autoComplete, placeholder,
}: {
  defaultValue?: string; type?: string; autoComplete?: string; placeholder?: string;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className="rounded-lg bg-field px-3 py-2.5 text-sm text-field-fg placeholder:text-field-ph border border-border outline-none transition-all duration-150 focus:border-accent focus:ring-2 focus:ring-accent/20"
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground">{children}</h3>;
}

function Divider() {
  return <hr className="border-sep" />;
}

function ToggleRow({
  label, desc, value, onChange,
}: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-2 px-4 py-3.5">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground/90">{label}</span>
        {desc && <span className="text-xs text-muted">{desc}</span>}
      </div>
      <Switch isSelected={value} onChange={onChange} aria-label={label}>
        <Switch.Content>
          <Switch.Control><Switch.Thumb /></Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}

/* ─── Tab: Compte ───────────────────────────────────────────── */
function AccountTab() {
  const [showPass, setShowPass] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Informations du compte</SectionTitle>

      {/* Account card */}
      <div className="rounded-xl bg-surface-2 overflow-hidden">
        <div
          className="h-16"
          style={{ background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 40%, var(--surface)) 100%)" }}
        />
        <div className="flex items-end gap-4 px-5 pb-4 -mt-8">
          <div className="relative size-16 shrink-0">
            <Avatar className="size-16 border-4 border-surface-2">
              <Avatar.Fallback className="text-xl font-bold bg-accent text-accent-fg border-none">
                {CURRENT_USER.initials}
              </Avatar.Fallback>
            </Avatar>
            <PresenceDot status={CURRENT_USER.status} className="absolute -bottom-1 -right-1" />
          </div>
          <div className="pb-1">
            <p className="text-base font-bold text-foreground">{CURRENT_USER.name}</p>
            <p className="text-xs text-muted">#{CURRENT_USER.id}</p>
          </div>
        </div>
      </div>

      <Divider />

      {/* Email */}
      <div className="flex flex-col gap-4">
        <Field label="Adresse e-mail" hint="Ton adresse e-mail n'est pas visible publiquement.">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type="email" defaultValue="karlo.hupe@gmail.com" autoComplete="email"
              className="w-full rounded-lg bg-field pl-9 pr-3 py-2.5 text-sm text-field-fg border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        </Field>

        <Field label="Numéro de téléphone" hint="Utilisé pour la vérification en deux étapes.">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type="tel" placeholder="+33 6 XX XX XX XX" autoComplete="tel"
              className="w-full rounded-lg bg-field pl-9 pr-3 py-2.5 text-sm text-field-fg placeholder:text-field-ph border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
        </Field>

        <Field label="Mot de passe">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <input
              type={showPass ? "text" : "password"} defaultValue="••••••••••••"
              className="w-full rounded-lg bg-field pl-9 pr-10 py-2.5 text-sm text-field-fg border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors">
              {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
      </div>

      <Button className="self-start bg-accent text-accent-fg text-sm font-semibold hover:opacity-90">
        Enregistrer les modifications
      </Button>

      <Divider />

      {/* Danger zone */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-danger">Zone dangereuse</p>
        <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Supprimer mon compte</p>
            <p className="text-xs text-muted">Cette action est irréversible.</p>
          </div>
          <Button size="sm" variant="danger" className="text-xs">Supprimer</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Profil ───────────────────────────────────────────── */
function ProfileTab() {
  const [status, setStatus] = useState<"online" | "away" | "dnd" | "offline">("online");

  const STATUS_OPTIONS: { id: typeof status; label: string; color: string }[] = [
    { id: "online", label: "En ligne", color: "bg-online" },
    { id: "away", label: "Absent", color: "bg-away" },
    { id: "dnd", label: "Ne pas déranger", color: "bg-dnd" },
    { id: "offline", label: "Invisible", color: "bg-offline" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Profil public</SectionTitle>

      {/* Preview card */}
      <div className="rounded-xl bg-surface-2 overflow-hidden">
        <div
          className="h-20"
          style={{ background: "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklch, var(--accent) 30%, var(--background)) 100%)" }}
        />
        <div className="relative px-4 pb-4">
          <div className="absolute -top-8 flex items-end gap-3">
            <div className="relative">
              <Avatar className="size-16 border-4 border-surface-2">
                <Avatar.Fallback className="text-xl font-bold bg-accent text-accent-fg border-none">
                  {CURRENT_USER.initials}
                </Avatar.Fallback>
              </Avatar>
              <button className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 hover:opacity-100 transition-opacity">
                <Camera className="size-4 text-foreground" />
              </button>
              <PresenceDot status={status} className="absolute -bottom-1 -right-1" />
            </div>
          </div>
          <div className="pt-10">
            <p className="font-bold text-foreground">{CURRENT_USER.name}</p>
            <p className="text-xs text-muted">{CURRENT_USER.customStatus ?? "Aucun statut"}</p>
          </div>
        </div>
      </div>

      <Field label="Nom d'affichage">
        <TextInput defaultValue={CURRENT_USER.name} autoComplete="name" />
      </Field>

      <Field label="Statut personnalisé" hint="Visible par tous vos contacts.">
        <TextInput defaultValue={CURRENT_USER.customStatus} placeholder="Qu'est-ce que vous faites ?" />
      </Field>

      <Field label="Bio" hint="Max 190 caractères.">
        <textarea
          rows={3}
          defaultValue="Développeur passionné, fan de design et de code propre ✨"
          className="resize-none rounded-lg bg-field px-3 py-2.5 text-sm text-field-fg placeholder:text-field-ph border border-border outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </Field>

      <Divider />

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Statut de présence</p>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all text-sm ${
                status === s.id
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-field/50 text-muted hover:border-border hover:text-foreground"
              }`}
            >
              <span className={`size-2.5 rounded-full shrink-0 ${s.color}`} />
              {s.label}
              {status === s.id && <Check className="ml-auto size-3.5 text-accent" />}
            </button>
          ))}
        </div>
      </div>

      <Button className="self-start bg-accent text-accent-fg text-sm font-semibold hover:opacity-90">
        Enregistrer le profil
      </Button>
    </div>
  );
}

/* ─── Tab: Apparence ────────────────────────────────────────── */
/* Palette options for the accent picker. Selecting one writes the value
 * straight into the `--accent` theme variable, so the whole app follows. */
const ACCENT_SWATCHES: { label: string; value: string }[] = [
  { label: "Violet", value: "oklch(57.74% 0.2091 273.85)" }, // = thème par défaut
  { label: "Bleu", value: "oklch(58% 0.20 252)" },
  { label: "Cyan", value: "oklch(62% 0.16 220)" },
  { label: "Vert", value: "oklch(58% 0.20 150)" },
  { label: "Rose", value: "oklch(60% 0.21 350)" },
  { label: "Orange", value: "oklch(64% 0.19 55)" },
  { label: "Rouge", value: "oklch(58% 0.22 25)" },
  { label: "Or", value: "oklch(66% 0.16 85)" },
];

function AppearanceTab({
  orientation = "vertical",
  onSetOrientation,
}: {
  orientation?: NavOrientation;
  onSetOrientation?: (o: NavOrientation) => void;
}) {
  const [selectedAccent, setSelectedAccent] = useState(0);
  const [density, setDensity] = useState<"compact" | "normal" | "comfortable">("normal");
  const [fontSize, setFontSize] = useState(14);

  const applyAccent = (i: number) => {
    setSelectedAccent(i);
    // Single source of truth: mutate the theme var → toute l'UI suit.
    document.documentElement.style.setProperty("--accent", ACCENT_SWATCHES[i].value);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Apparence</SectionTitle>

      {/* Theme */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Thème</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "dark", label: "Sombre", icon: Moon, active: true },
            { id: "light", label: "Clair", icon: Sun, active: false },
            { id: "auto", label: "Automatique", icon: Monitor, active: false },
          ].map(({ id, label, icon: Icon, active }) => (
            <button
              key={id}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 transition-all ${
                active ? "border-accent bg-accent/10" : "border-border bg-field/40 text-muted hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className={`size-5 ${active ? "text-accent" : ""}`} />
              <span className={`text-xs font-medium ${active ? "text-accent" : ""}`}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Server bar orientation */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Barre des serveurs</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "vertical", label: "Rail vertical", desc: "À gauche de l'écran", icon: PanelLeft },
            { id: "horizontal", label: "Barre horizontale", desc: "En haut de l'écran", icon: PanelTop },
          ] as const).map(({ id, label, desc, icon: Icon }) => {
            const active = orientation === id;
            return (
              <button
                key={id}
                onClick={() => onSetOrientation?.(id)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                  active ? "border-accent bg-accent/10" : "border-border bg-field/40 hover:border-border"
                }`}
              >
                <Icon className={`size-5 shrink-0 mt-0.5 ${active ? "text-accent" : "text-muted"}`} />
                <div>
                  <p className={`text-sm font-medium ${active ? "text-accent" : "text-foreground/85"}`}>{label}</p>
                  <p className="text-xs text-muted">{desc}</p>
                </div>
                {active && <Check className="ml-auto size-3.5 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Accent color */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Couleur d'accent</p>
          <span className="text-xs text-muted">{ACCENT_SWATCHES[selectedAccent].label}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_SWATCHES.map((s, i) => (
            <button
              key={s.label}
              title={s.label}
              onClick={() => applyAccent(i)}
              className={`size-8 rounded-full ring-offset-2 ring-offset-surface transition-all ${
                selectedAccent === i ? "ring-2 ring-foreground scale-110" : "hover:scale-105"
              }`}
              style={{ background: s.value }}
              aria-label={s.label}
            />
          ))}
        </div>
        {/* Live preview — driven by var(--accent) */}
        <div className="flex gap-2">
          <div className="h-8 flex-1 rounded-lg flex items-center justify-center text-xs font-medium bg-accent text-accent-fg">
            Bouton principal
          </div>
          <div className="h-8 w-32 rounded-lg flex items-center justify-center text-xs bg-accent/15 text-accent">
            Accent subtil
          </div>
        </div>
      </div>

      <Divider />

      {/* Density */}
      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Densité des messages</p>
        <div className="grid grid-cols-3 gap-2">
          {(["compact", "normal", "comfortable"] as const).map((d) => {
            const LABELS = { compact: "Compacte", normal: "Normale", comfortable: "Confortable" };
            const DESCS = { compact: "8px", normal: "12px", comfortable: "20px" };
            return (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`flex flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all ${
                  density === d ? "border-accent bg-accent/10" : "border-border text-muted hover:border-border hover:text-foreground"
                }`}
              >
                <span className={`text-sm font-medium ${density === d ? "text-accent" : ""}`}>
                  {LABELS[d]}
                </span>
                <span className="text-xs text-muted">{DESCS[d]} d'espacement</span>
              </button>
            );
          })}
        </div>
      </div>

      <Divider />

      {/* Font size */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Taille du texte</p>
          <span className="text-xs font-medium text-accent">{fontSize}px</span>
        </div>
        <input
          type="range" min={12} max={18} step={1} value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-muted/60">
          <span>Petit (12)</span>
          <span>Normal (14)</span>
          <span>Grand (18)</span>
        </div>
        <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-muted leading-relaxed"
          style={{ fontSize: `${fontSize}px` }}>
          Aperçu du texte à {fontSize}px — Les messages s'afficheront ainsi.
        </p>
      </div>
    </div>
  );
}

/* ─── Tab: Notifications ────────────────────────────────────── */
function NotificationsTab() {
  const [notifs, setNotifs] = useState({
    dm: true, mentions: true, reactions: false,
    calls: true, sounds: false, push: true, email: false,
  });

  const toggle = useCallback(
    (key: keyof typeof notifs) => (v: boolean) => setNotifs((p) => ({ ...p, [key]: v })),
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Notifications</SectionTitle>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">Messages</p>
        <ToggleRow label="Messages directs" desc="Chaque nouveau message dans une DM" value={notifs.dm} onChange={toggle("dm")} />
        <ToggleRow label="Mentions @" desc="Quand quelqu'un vous mentionne dans un serveur" value={notifs.mentions} onChange={toggle("mentions")} />
        <ToggleRow label="Réactions" desc="Sur vos propres messages" value={notifs.reactions} onChange={toggle("reactions")} />
        <ToggleRow label="Appels entrants" desc="Appels vocaux et vidéo" value={notifs.calls} onChange={toggle("calls")} />
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">Canaux</p>
        <ToggleRow label="Sons de notification" desc="Jouer un son pour chaque notification" value={notifs.sounds} onChange={toggle("sounds")} />
        <ToggleRow label="Notifications push" desc="Sur votre appareil mobile" value={notifs.push} onChange={toggle("push")} />
        <ToggleRow label="E-mails" desc="Résumé hebdomadaire par e-mail" value={notifs.email} onChange={toggle("email")} />
      </div>

      <Divider />

      <div className="rounded-xl bg-surface-2 p-4 flex gap-3">
        <Bell className="size-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Mode Ne pas déranger</p>
          <p className="text-xs text-muted mt-0.5">Désactive toutes les notifications temporairement. Vous pouvez définir des heures calmes.</p>
          <Button size="sm" variant="secondary" className="mt-2 text-xs h-7">Configurer les heures calmes</Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Confidentialité ──────────────────────────────────── */
function PrivacyTab() {
  const [dm, setDm] = useState<"everyone" | "friends" | "nobody">("friends");
  const [friendReq, setFriendReq] = useState<"everyone" | "friends_of_friends" | "nobody">("everyone");
  const [priv, setPriv] = useState({ status: true, readReceipts: true, typing: true });

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Confidentialité</SectionTitle>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Qui peut m'envoyer des DM ?</p>
        {(["everyone", "friends", "nobody"] as const).map((opt) => {
          const LABELS = { everyone: "Tout le monde", friends: "Amis uniquement", nobody: "Personne" };
          const DESCS = {
            everyone: "N'importe qui peut vous contacter",
            friends: "Seulement vos amis",
            nobody: "Personne ne peut vous envoyer de DM",
          };
          return (
            <button
              key={opt}
              onClick={() => setDm(opt)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                dm === opt ? "border-accent bg-accent/10" : "border-border bg-field/30 hover:border-border/80"
              }`}
            >
              <div className={`size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${dm === opt ? "border-accent" : "border-muted"}`}>
                {dm === opt && <div className="size-1.5 rounded-full bg-accent" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${dm === opt ? "text-accent" : "text-foreground/80"}`}>
                  {LABELS[opt]}
                </p>
                <p className="text-xs text-muted">{DESCS[opt]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <Divider />

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted mb-1">Visibilité</p>
        <ToggleRow
          label="Afficher mon statut de présence"
          desc="Vos amis peuvent voir si vous êtes en ligne"
          value={priv.status}
          onChange={(v) => setPriv((p) => ({ ...p, status: v }))}
        />
        <ToggleRow
          label="Accusés de lecture"
          desc="Les autres voient quand vous avez lu leurs messages"
          value={priv.readReceipts}
          onChange={(v) => setPriv((p) => ({ ...p, readReceipts: v }))}
        />
        <ToggleRow
          label="Indicateur de saisie"
          desc="Afficher quand vous êtes en train d'écrire"
          value={priv.typing}
          onChange={(v) => setPriv((p) => ({ ...p, typing: v }))}
        />
      </div>
    </div>
  );
}

/* ─── Tab: Accessibilité ────────────────────────────────────── */
function AccessibilityTab() {
  const [opts, setOpts] = useState({
    reducedMotion: false,
    highContrast: false,
    largeClick: false,
    gifAutoPlay: true,
  });
  const toggle = (key: keyof typeof opts) => (v: boolean) =>
    setOpts((p) => ({ ...p, [key]: v }));

  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Accessibilité</SectionTitle>
      <div className="flex flex-col gap-2">
        <ToggleRow label="Réduire les animations" desc="Moins de transitions et d'effets visuels" value={opts.reducedMotion} onChange={toggle("reducedMotion")} />
        <ToggleRow label="Contraste élevé" desc="Augmente le contraste pour une meilleure lisibilité" value={opts.highContrast} onChange={toggle("highContrast")} />
        <ToggleRow label="Zones de clic élargies" desc="Cibles tactiles plus grandes" value={opts.largeClick} onChange={toggle("largeClick")} />
        <ToggleRow label="Lecture automatique des GIFs" desc="Jouer les GIFs dès l'affichage" value={opts.gifAutoPlay} onChange={toggle("gifAutoPlay")} />
      </div>
    </div>
  );
}

/* ─── Tab: Développeur ──────────────────────────────────────── */
function DeveloperTab() {
  return (
    <div className="flex flex-col gap-6">
      <SectionTitle>Développeur</SectionTitle>
      <div className="rounded-xl bg-surface-2 p-4 flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground/80">Mode développeur</p>
        <p className="text-xs text-muted">Affiche les identifiants techniques (ID utilisateur, canal, serveur) dans les menus contextuels.</p>
        <div className="rounded-lg bg-field border border-border px-3 py-2 font-mono text-xs text-muted">
          USER_ID: {CURRENT_USER.id} · VERSION: 0.1.0-alpha
        </div>
      </div>
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────── */
export function SettingsSheet({ open, onClose, orientation, onSetOrientation }: SettingsSheetProps) {
  const [tab, setTab] = useState<TabId>("account");

  if (!open) return null;

  const renderTab = () => {
    switch (tab) {
      case "account": return <AccountTab />;
      case "profile": return <ProfileTab />;
      case "privacy": return <PrivacyTab />;
      case "appearance":
        return <AppearanceTab orientation={orientation} onSetOrientation={onSetOrientation} />;
      case "notifications": return <NotificationsTab />;
      case "accessibility": return <AccessibilityTab />;
      case "developer": return <DeveloperTab />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — full-screen, 2-column */}
      <div className="relative z-10 flex h-full w-full animate-fade-in">
        {/* ── Left nav ── */}
        <div className="flex w-56 shrink-0 flex-col border-r border-sep bg-background overflow-y-auto py-4 px-2">
          {/* User mini card */}
          <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 mb-3">
            <div className="relative">
              <Avatar size="sm" className="size-9">
                <Avatar.Fallback className="text-sm font-bold bg-accent text-accent-fg border-none">
                  {CURRENT_USER.initials}
                </Avatar.Fallback>
              </Avatar>
              <PresenceDot status={CURRENT_USER.status} size="sm" className="absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{CURRENT_USER.name}</p>
              <p className="truncate text-[10px] text-muted">{CURRENT_USER.customStatus}</p>
            </div>
          </div>

          <div className="h-px bg-sep mx-2 mb-3" />

          {/* Nav sections */}
          <nav className="flex flex-col gap-4">
            {NAV.map((section) => (
              <div key={section.label}>
                <p className="mb-1 px-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted/40">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-all duration-150 ${
                        tab === id
                          ? "bg-surface-2 text-foreground font-medium"
                          : "text-muted hover:bg-surface hover:text-foreground/80"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${tab === id ? "text-accent" : ""}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="flex-1" />

          <div className="h-px bg-sep mx-2 mb-3" />

          {/* Logout */}
          <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/10 transition-colors">
            <LogOut className="size-4 shrink-0" />
            Se déconnecter
          </button>
        </div>

        {/* ── Content area ── */}
        <div className="flex flex-1 flex-col bg-surface overflow-hidden">
          {/* Content header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-sep px-8">
            <h2 className="text-base font-bold text-foreground">
              {NAV.flatMap((s) => s.items).find((i) => i.id === tab)?.label}
            </h2>
            <Button
              isIconOnly variant="ghost" size="sm"
              className="size-8 text-muted hover:text-foreground"
              onPress={onClose} aria-label="Fermer les paramètres"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-xl px-8 py-7">
              {renderTab()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
