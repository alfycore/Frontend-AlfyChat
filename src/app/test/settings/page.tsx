'use client';

import { useState } from 'react';
import {
  Accordion, Avatar, Badge, Button, Card, Chip, InputGroup, Label,
  ListBox, Modal, ScrollShadow, Select, Separator, Slider, Surface,
  Switch, Tabs, Tag, TagGroup, TextArea, toast,
} from '@heroui/react';
import {
  User, Shield, Palette, Bell, Mic, Monitor, Globe, Lock,
  KeyRound, Smartphone, Eye, EyeOff, Camera, LogOut, Trash2,
  Sun, Moon, Volume2, VolumeX, ChevronRight, Download, HardDrive,
  Languages, Link2, QrCode, Mail,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'account', label: 'Mon compte', icon: <User className="size-4" />, group: 'Paramètres utilisateur' },
  { id: 'profile', label: 'Profil', icon: <User className="size-4" />, group: 'Paramètres utilisateur' },
  { id: 'privacy', label: 'Confidentialité', icon: <Shield className="size-4" />, group: 'Paramètres utilisateur' },
  { id: 'devices', label: 'Appareils', icon: <Smartphone className="size-4" />, group: 'Paramètres utilisateur' },
  { id: 'connections', label: 'Connexions', icon: <Link2 className="size-4" />, group: 'Paramètres utilisateur' },
  { id: 'appearance', label: 'Apparence', icon: <Palette className="size-4" />, group: 'Paramètres app' },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-4" />, group: 'Paramètres app' },
  { id: 'voice', label: 'Voix & Vidéo', icon: <Mic className="size-4" />, group: 'Paramètres app' },
  { id: 'language', label: 'Langue', icon: <Languages className="size-4" />, group: 'Paramètres app' },
  { id: 'advanced', label: 'Avancé', icon: <HardDrive className="size-4" />, group: 'Paramètres app' },
];

// ─── Account Section ─────────────────────────────────────────────────────────

function AccountSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Mon compte</h2>
        <p className="text-sm text-muted">Gérez vos informations personnelles</p>
      </div>

      <Card variant="secondary">
        <Card.Content>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar size="lg" className="ring-4 ring-surface">
                <Avatar.Image src="https://i.pravatar.cc/150?u=me" />
                <Avatar.Fallback>W</Avatar.Fallback>
              </Avatar>
              <Button isIconOnly size="sm" variant="secondary" className="absolute -bottom-1 -right-1 rounded-full">
                <Camera className="size-3" />
              </Button>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">WilTark</h3>
              <p className="text-sm text-muted">@wiltark</p>
            </div>
            <Button variant="secondary" size="sm">Modifier le profil</Button>
          </div>
        </Card.Content>
      </Card>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted">Nom d&apos;utilisateur</p>
            <p className="text-sm font-medium">WilTark</p>
          </div>
          <Button variant="secondary" size="sm">Modifier</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted">Email</p>
            <p className="text-sm font-medium">w****@alfychat.app</p>
          </div>
          <Button variant="secondary" size="sm">Révéler</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-muted">Téléphone</p>
            <p className="text-sm font-medium text-muted">Non renseigné</p>
          </div>
          <Button variant="secondary" size="sm">Ajouter</Button>
        </div>
      </Surface>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Sécurité du compte</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeyRound className="size-5 text-muted" />
            <div>
              <p className="text-sm font-medium">Mot de passe</p>
              <p className="text-xs text-muted">Dernière modification il y a 3 mois</p>
            </div>
          </div>
          <Button variant="secondary" size="sm">Changer</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="size-5 text-muted" />
            <div>
              <p className="text-sm font-medium">Authentification à deux facteurs</p>
              <p className="text-xs text-muted">Protégez votre compte avec la 2FA</p>
            </div>
          </div>
          <Button variant="secondary" size="sm">Activer</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode className="size-5 text-muted" />
            <div>
              <p className="text-sm font-medium">Clés de sécurité</p>
              <p className="text-xs text-muted">Aucune clé configurée</p>
            </div>
          </div>
          <Button variant="secondary" size="sm">Configurer</Button>
        </div>
      </Surface>

      <Separator />

      <div className="flex gap-3">
        <Button variant="danger-soft" size="sm"><LogOut className="size-4" /> Déconnexion</Button>
        <Button variant="danger" size="sm"><Trash2 className="size-4" /> Supprimer le compte</Button>
      </div>
    </div>
  );
}

// ─── Profile Section ─────────────────────────────────────────────────────────

function ProfileSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Profil</h2>
        <p className="text-sm text-muted">Personnalisez votre profil public</p>
      </div>

      <div className="flex gap-6">
        {/* Edit form */}
        <div className="flex-1 space-y-4">
          <InputGroup>
            <Label className="text-xs font-medium">Nom d&apos;affichage</Label>
            <InputGroup.Input defaultValue="WilTark" />
          </InputGroup>

          <div>
            <Label className="text-xs font-medium">Bio</Label>
            <TextArea
              defaultValue="Développeur passionné. Fan de TypeScript, React et design systems. Créateur d'AlfyChat. 🚀"
              rows={3}
              variant="secondary"
            />
          </div>

          <InputGroup>
            <Label className="text-xs font-medium">Pronoms</Label>
            <InputGroup.Input placeholder="Ex: il/lui, elle/elle" />
          </InputGroup>

          <div>
            <Label className="text-xs font-medium">Couleur de bannière</Label>
            <div className="mt-1.5 flex gap-2">
              {['bg-violet-500', 'bg-blue-500', 'bg-green-500', 'bg-rose-500', 'bg-amber-500', 'bg-cyan-500'].map(c => (
                <button
                  key={c}
                  className={`size-8 rounded-full ${c} ring-2 ring-transparent transition hover:ring-foreground/20 ${c === 'bg-violet-500' ? 'ring-accent ring-offset-2 ring-offset-surface' : ''}`}
                />
              ))}
            </div>
          </div>

          <Button size="sm" className="mt-2">Sauvegarder</Button>
        </div>

        {/* Preview */}
        <div className="w-80 shrink-0">
          <p className="mb-2 text-xs font-bold uppercase text-muted">Aperçu</p>
          <Card>
            <div className="h-20 rounded-t-xl bg-violet-500" />
            <div className="relative px-4 pb-4">
              <div className="-mt-10 mb-2">
                <Avatar size="lg" className="ring-4 ring-surface">
                  <Avatar.Image src="https://i.pravatar.cc/150?u=me" />
                  <Avatar.Fallback>W</Avatar.Fallback>
                </Avatar>
              </div>
              <h3 className="text-lg font-bold">WilTark</h3>
              <p className="text-xs text-muted">@wiltark</p>
              <p className="mt-2 text-xs leading-relaxed">
                Développeur passionné. Fan de TypeScript, React et design systems. Créateur d&apos;AlfyChat.
              </p>
              <Separator className="my-3" />
              <p className="text-[10px] font-bold uppercase text-muted">Membre depuis</p>
              <p className="text-xs text-muted">15 mars 2024</p>
              <Separator className="my-3" />
              <p className="text-[10px] font-bold uppercase text-muted">Rôles</p>
              <div className="mt-1 flex gap-1">
                <Chip size="sm" variant="soft" color="accent">Admin</Chip>
                <Chip size="sm" variant="soft">Développeur</Chip>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Appearance Section ──────────────────────────────────────────────────────

function AppearanceSection() {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Apparence</h2>
        <p className="text-sm text-muted">Personnalisez l&apos;interface d&apos;AlfyChat</p>
      </div>

      {/* Theme */}
      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Thème</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Clair', icon: <Sun className="size-5" />, selected: false },
            { id: 'dark', label: 'Sombre', icon: <Moon className="size-5" />, selected: true },
            { id: 'system', label: 'Système', icon: <Monitor className="size-5" />, selected: false },
          ].map(t => (
            <button
              key={t.id}
              className={`flex flex-col items-center gap-2 rounded-xl p-4 transition ${t.selected ? 'bg-accent/10 text-accent ring-2 ring-accent' : 'bg-surface-tertiary/40 text-muted hover:text-foreground'}`}
            >
              {t.icon}
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </Surface>

      {/* Accent color */}
      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Couleur d&apos;accent</h3>
        <TagGroup aria-label="Couleur d'accent" selectionMode="single" defaultSelectedKeys={['violet']}>
          <TagGroup.List>
            <Tag id="violet">Violet</Tag>
            <Tag id="blue">Bleu</Tag>
            <Tag id="green">Vert</Tag>
            <Tag id="rose">Rose</Tag>
            <Tag id="orange">Orange</Tag>
            <Tag id="cyan">Cyan</Tag>
          </TagGroup.List>
        </TagGroup>
      </Surface>

      {/* Font size */}
      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Taille du texte</h3>
        <Slider defaultValue={16} minValue={12} maxValue={20} step={1}>
          <div className="flex justify-between">
            <Label className="text-xs text-muted">Taille de police des messages</Label>
            <Slider.Output className="text-xs font-medium" />
          </div>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </Surface>

      {/* Chat display */}
      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Affichage du chat</h3>

        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Mode compact</Label>
            <p className="text-[11px] text-muted">Réduire l&apos;espacement entre les messages</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Aperçu des liens</Label>
            <p className="text-[11px] text-muted">Afficher les previews des liens partagés</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Réactions emoji</Label>
            <p className="text-[11px] text-muted">Afficher les réactions sur les messages</p>
          </Switch.Content>
        </Switch>
      </Surface>
    </div>
  );
}

// ─── Notifications Section ───────────────────────────────────────────────────

function NotificationsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Notifications</h2>
        <p className="text-sm text-muted">Configurez quand et comment vous êtes notifié</p>
      </div>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Notifications push</h3>
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Activer les notifications push</Label>
            <p className="text-[11px] text-muted">Recevez des alertes même quand l&apos;app est fermée</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Messages privés</Label>
            <p className="text-[11px] text-muted">Notification pour chaque nouveau message privé</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Mentions @everyone</Label>
            <p className="text-[11px] text-muted">Notification quand quelqu&apos;un utilise @everyone</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Demandes d&apos;amis</Label>
            <p className="text-[11px] text-muted">Notification pour les nouvelles demandes d&apos;amis</p>
          </Switch.Content>
        </Switch>
      </Surface>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Sons</h3>
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Son des messages</Label>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Son de connexion/déconnexion</Label>
          </Switch.Content>
        </Switch>
        <Separator />
        <Slider defaultValue={80} minValue={0} maxValue={100}>
          <div className="flex justify-between">
            <Label className="text-xs text-muted">Volume des notifications</Label>
            <Slider.Output className="text-xs font-medium" />
          </div>
          <Slider.Track>
            <Slider.Fill />
            <Slider.Thumb />
          </Slider.Track>
        </Slider>
      </Surface>
    </div>
  );
}

// ─── Voice Section ───────────────────────────────────────────────────────────

function VoiceSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Voix & Vidéo</h2>
        <p className="text-sm text-muted">Paramètres audio et vidéo pour les appels</p>
      </div>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Entrée audio</h3>
        <Select className="w-full" defaultSelectedKey="default">
          <Label className="text-xs font-medium">Microphone</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="default" textValue="Microphone par défaut">Microphone par défaut<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item id="headset" textValue="Casque USB">Casque USB<ListBox.ItemIndicator /></ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <Slider defaultValue={75} minValue={0} maxValue={100}>
          <div className="flex justify-between">
            <Label className="text-xs text-muted">Volume d&apos;entrée</Label>
            <Slider.Output className="text-xs font-medium" />
          </div>
          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
        </Slider>
      </Surface>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Sortie audio</h3>
        <Select className="w-full" defaultSelectedKey="default">
          <Label className="text-xs font-medium">Haut-parleur</Label>
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="default" textValue="Haut-parleur par défaut">Haut-parleur par défaut<ListBox.ItemIndicator /></ListBox.Item>
              <ListBox.Item id="headset" textValue="Casque USB">Casque USB<ListBox.ItemIndicator /></ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
        <Slider defaultValue={100} minValue={0} maxValue={100}>
          <div className="flex justify-between">
            <Label className="text-xs text-muted">Volume de sortie</Label>
            <Slider.Output className="text-xs font-medium" />
          </div>
          <Slider.Track><Slider.Fill /><Slider.Thumb /></Slider.Track>
        </Slider>
      </Surface>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Traitement audio</h3>
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Suppression du bruit</Label>
            <p className="text-[11px] text-muted">Réduit le bruit de fond avec l&apos;IA</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Suppression de l&apos;écho</Label>
            <p className="text-[11px] text-muted">Empêche le retour audio</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Contrôle automatique du gain</Label>
            <p className="text-[11px] text-muted">Ajuste automatiquement le volume du micro</p>
          </Switch.Content>
        </Switch>
      </Surface>
    </div>
  );
}

// ─── Privacy Section ─────────────────────────────────────────────────────────

function PrivacySection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Confidentialité & Sécurité</h2>
        <p className="text-sm text-muted">Contrôlez qui peut vous contacter et voir vos informations</p>
      </div>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Messages privés</h3>
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Autoriser les messages de tout le monde</Label>
            <p className="text-[11px] text-muted">Les membres des serveurs partagés peuvent vous envoyer des MP</p>
          </Switch.Content>
        </Switch>
        <Separator />
        <Switch defaultSelected>
          <Switch.Control><Switch.Thumb /></Switch.Control>
          <Switch.Content>
            <Label className="text-sm">Demandes d&apos;amis de tout le monde</Label>
            <p className="text-[11px] text-muted">N&apos;importe qui peut vous envoyer une demande d&apos;ami</p>
          </Switch.Content>
        </Switch>
      </Surface>

      <Surface variant="secondary" className="space-y-4 rounded-xl p-5">
        <h3 className="text-sm font-bold">Chiffrement</h3>
        <Accordion variant="surface">
          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm">
                <KeyRound className="size-4" /> Chiffrement de bout en bout
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="text-xs text-muted">
                Tous vos messages privés et appels sont chiffrés de bout en bout. Personne, pas même AlfyChat, ne peut accéder à vos conversations.
                <div className="mt-2">
                  <Chip size="sm" color="success" variant="soft">Actif</Chip>
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Heading>
              <Accordion.Trigger className="text-sm">
                <Smartphone className="size-4" /> Appareils vérifiés
                <Accordion.Indicator />
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="space-y-2 text-xs text-muted">
                <div className="flex items-center justify-between rounded-lg bg-surface-tertiary/30 p-3">
                  <div>
                    <p className="font-medium text-foreground">Windows — Chrome 125</p>
                    <p>Paris, France · Session actuelle</p>
                  </div>
                  <Chip size="sm" color="success" variant="soft">Active</Chip>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-tertiary/30 p-3">
                  <div>
                    <p className="font-medium text-foreground">iPhone 15 Pro — Safari</p>
                    <p>Paris, France · Il y a 2h</p>
                  </div>
                  <Button size="sm" variant="danger-soft">Révoquer</Button>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface-tertiary/30 p-3">
                  <div>
                    <p className="font-medium text-foreground">MacBook Pro — Firefox</p>
                    <p>Lyon, France · Il y a 3 jours</p>
                  </div>
                  <Button size="sm" variant="danger-soft">Révoquer</Button>
                </div>
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Surface>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const SECTION_COMPONENTS: Record<string, () => React.JSX.Element> = {
  account: AccountSection,
  profile: ProfileSection,
  appearance: AppearanceSection,
  notifications: NotificationsSection,
  voice: VoiceSection,
  privacy: PrivacySection,
};

export default function TestSettingsPage() {
  const [activeSection, setActiveSection] = useState('account');

  const groups = [...new Set(SECTIONS.map(s => s.group))];
  const ActiveComponent = SECTION_COMPONENTS[activeSection] ?? AccountSection;

  return (
    <div className="flex h-[calc(100vh-49px)]">
      {/* Sidebar */}
      <div className="w-56 shrink-0 overflow-y-auto border-r border-border/20 bg-surface-secondary/30 py-4">
        <ScrollShadow className="px-2">
          {groups.map(group => (
            <div key={group} className="mb-3">
              <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-muted">
                {group}
              </p>
              {SECTIONS.filter(s => s.group === group).map(section => (
                <Button
                  key={section.id}
                  fullWidth
                  variant={activeSection === section.id ? 'secondary' : 'ghost'}
                  size="sm"
                  onPress={() => setActiveSection(section.id)}
                >
                  {section.icon}
                  <span className="flex-1 text-left">{section.label}</span>
                </Button>
              ))}
            </div>
          ))}

          <Separator className="my-3" />
          <Button fullWidth variant="danger-soft" size="sm">
            <LogOut className="size-4" /> Déconnexion
          </Button>
          <p className="mt-4 px-3 text-[10px] text-muted">AlfyChat v2.0.0 · HeroUI v3</p>
        </ScrollShadow>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-10 py-8">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}
