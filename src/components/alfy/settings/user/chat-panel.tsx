'use client';

import { Label, ListBox, Radio, RadioGroup, Select, Switch } from '@heroui/react';
import { Accessibility } from 'lucide-react';

import { PanelHeader, RelatedSetting, useSettingsNav } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useAppPrefs, type SpoilerMode } from '@/hooks/use-app-prefs';

const SPOILER_OPTIONS = [
  { id: 'always', label: 'Toujours' },
  { id: 'moderated', label: 'Sur les salons que je modère' },
  { id: 'click', label: 'Au clic uniquement' },
];

/** Interrupteur des réglages — évite de répéter la composition HeroUI. */
function Toggle({
  label,
  isSelected,
  onChange,
  isDisabled,
}: {
  label: string;
  isSelected: boolean;
  onChange: (v: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <Switch aria-label={label} isSelected={isSelected} onChange={onChange} isDisabled={isDisabled}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}

export function ChatPanel() {
  const { prefs, updatePrefs } = useAppPrefs();
  const { goTo } = useSettingsNav();
  const avatarsLocked = prefs.messageDisplay !== 'compact';

  return (
    <div>
      <PanelHeader
        title="Chat"
        description="Médias, aperçus, saisie et recherche dans les conversations."
      />

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <SettingsSection
        title="Messages"
        description="Afficher les images, vidéos et médias partagés dans les conversations."
      >
        <SettingsRow label="Lorsqu'ils sont envoyés comme liens dans le salon">
          <Toggle
            label="Afficher les médias envoyés comme liens"
            isSelected={prefs.showLinkedMedia}
            onChange={(v) => updatePrefs({ showLinkedMedia: v })}
          />
        </SettingsRow>
        <SettingsRow label="Lorsqu'ils sont téléversés directement dans AlfyChat">
          <Toggle
            label="Afficher les médias téléversés"
            isSelected={prefs.showUploadedMedia}
            onChange={(v) => updatePrefs({ showUploadedMedia: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Afficher les intégrations et aperçus de lien"
          description="Titre, description et vignette des liens partagés."
        >
          <Toggle
            label="Afficher les intégrations et aperçus de lien"
            isSelected={prefs.showEmbeds}
            onChange={(v) => updatePrefs({ showEmbeds: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher les réactions emoji">
          <Toggle
            label="Afficher les réactions emoji"
            isSelected={prefs.showReactions}
            onChange={(v) => updatePrefs({ showReactions: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher les spoilers" description="Contenu masqué par ||double barre||.">
          <Select
            className="w-64"
            aria-label="Afficher les spoilers"
            selectedKey={prefs.spoilerMode}
            onSelectionChange={(k) => updatePrefs({ spoilerMode: k as SpoilerMode })}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {SPOILER_OPTIONS.map((o) => (
                  <ListBox.Item key={o.id} id={o.id} textValue={o.label}>
                    {o.label}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </SettingsRow>
        <SettingsRow
          label="Ouvrir les fils en fenêtre fractionnée"
          description="Le fil s'ouvre à côté du salon plutôt qu'en plein écran."
        >
          <Toggle
            label="Ouvrir les fils en fenêtre fractionnée"
            isSelected={prefs.threadsSplitView}
            onChange={(v) => updatePrefs({ threadsSplitView: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Afficher les avatars des utilisateurs"
          description={
            avatarsLocked ? (
              <>
                Pour masquer les avatars, rendez-vous dans{' '}
                <button
                  type="button"
                  onClick={() => goTo('accessibility')}
                  className="cursor-pointer text-accent underline-offset-2 hover:underline"
                >
                  Accessibilité
                </button>{' '}
                et sélectionnez <strong className="font-medium">Compact</strong> sous Affichage des messages.
              </>
            ) : (
              'Mode compact : les avatars peuvent être masqués pour gagner de la place.'
            )
          }
        >
          <Toggle
            label="Afficher les avatars des utilisateurs"
            isSelected={avatarsLocked ? true : prefs.showAvatars}
            isDisabled={avatarsLocked}
            onChange={(v) => updatePrefs({ showAvatars: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <section className="mb-8">
        <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          Paramètres connexes
        </h3>
        <RelatedSetting
          icon={Accessibility}
          title="Accessibilité"
          description="Ajuste la densité visuelle des messages et de l'interface."
          tabId="accessibility"
        />
      </section>

      {/* ── Boîte de discussion ───────────────────────────────────────── */}
      <SettingsSection title="Boîte de discussion">
        <SettingsRow label="Afficher un aperçu des émojis, des mentions et de la syntaxe Markdown pendant la saisie">
          <Toggle
            label="Aperçu de la syntaxe pendant la saisie"
            isSelected={prefs.previewSyntax}
            onChange={(v) => updatePrefs({ previewSyntax: v })}
          />
        </SettingsRow>
        <SettingsRow
          label="Convertir automatiquement les émoticônes en émojis"
          description="Par exemple, si vous tapez :) AlfyChat le convertira en 🙂"
        >
          <Toggle
            label="Convertir les émoticônes en émojis"
            isSelected={prefs.emoticonToEmoji}
            onChange={(v) => updatePrefs({ emoticonToEmoji: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher les autocollants et GIF dans les résultats d'autocomplétion">
          <Toggle
            label="Autocollants et GIF dans l'autocomplétion"
            isSelected={prefs.stickerSuggestions}
            onChange={(v) => updatePrefs({ stickerSuggestions: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher les commandes dans les résultats d'autocomplétion">
          <Toggle
            label="Commandes dans l'autocomplétion"
            isSelected={prefs.commandSuggestions}
            onChange={(v) => updatePrefs({ commandSuggestions: v })}
          />
        </SettingsRow>
        <SettingsRow label="Afficher le bouton Envoyer un message">
          <Toggle
            label="Afficher le bouton Envoyer"
            isSelected={prefs.showSendButton}
            onChange={(v) => updatePrefs({ showSendButton: v })}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Recherche ─────────────────────────────────────────────────── */}
      <SettingsSection title="Rechercher" description="Par défaut, la recherche dans les messages privés…">
        <SettingsContent>
          <RadioGroup
            value={prefs.dmSearchScope}
            onChange={(v) => updatePrefs({ dmSearchScope: v as 'selected' | 'all' })}
            aria-label="Portée de la recherche dans les messages privés"
            className="flex flex-col gap-1"
          >
            <Radio value="selected" className="w-full">
              <Radio.Content className="w-full rounded-md p-2.5 hover:bg-surface-secondary">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Label>Recherche uniquement dans les MP sélectionnés</Label>
              </Radio.Content>
            </Radio>
            <Radio value="all" className="w-full">
              <Radio.Content className="w-full rounded-md p-2.5 hover:bg-surface-secondary">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Label>Recherche dans tous mes MP</Label>
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>
    </div>
  );
}
