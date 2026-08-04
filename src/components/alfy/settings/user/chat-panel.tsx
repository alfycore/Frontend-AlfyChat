'use client';

import { Label, ListBox, Radio, RadioGroup, Select, Switch } from '@heroui/react';
import { Accessibility } from 'lucide-react';

import { PanelHeader, RelatedSetting, useSettingsNav } from '@/components/alfy/settings/settings-shell';
import { SettingsContent, SettingsRow, SettingsSection } from '@/components/alfy/settings/section';
import { useTranslation } from '@/components/locale-provider';
import { useAppPrefs, type SpoilerMode } from '@/hooks/use-app-prefs';

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
  const { t } = useTranslation();
  const avatarsLocked = prefs.messageDisplay !== 'compact';

  const SPOILER_OPTIONS = [
    { id: 'always', label: t.profile.chat.messages.spoilerOptions.always },
    { id: 'moderated', label: t.profile.chat.messages.spoilerOptions.moderated },
    { id: 'click', label: t.profile.chat.messages.spoilerOptions.click },
  ];

  return (
    <div>
      <PanelHeader
        title={t.profile.chat.title}
        description={t.profile.chat.description}
      />

      {/* ── Messages ──────────────────────────────────────────────────── */}
      <SettingsSection
        title={t.profile.chat.messages.sectionTitle}
        description={t.profile.chat.messages.sectionDescription}
      >
        <SettingsRow label={t.profile.chat.messages.linkedMediaLabel}>
          <Toggle
            label={t.profile.chat.messages.linkedMediaAriaLabel}
            isSelected={prefs.showLinkedMedia}
            onChange={(v) => updatePrefs({ showLinkedMedia: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messages.uploadedMediaLabel}>
          <Toggle
            label={t.profile.chat.messages.uploadedMediaAriaLabel}
            isSelected={prefs.showUploadedMedia}
            onChange={(v) => updatePrefs({ showUploadedMedia: v })}
          />
        </SettingsRow>
        <SettingsRow
          label={t.profile.chat.messages.embedsLabel}
          description={t.profile.chat.messages.embedsDescription}
        >
          <Toggle
            label={t.profile.chat.messages.embedsLabel}
            isSelected={prefs.showEmbeds}
            onChange={(v) => updatePrefs({ showEmbeds: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messages.reactionsLabel}>
          <Toggle
            label={t.profile.chat.messages.reactionsLabel}
            isSelected={prefs.showReactions}
            onChange={(v) => updatePrefs({ showReactions: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messages.spoilersLabel} description={t.profile.chat.messages.spoilersDescription}>
          <Select
            className="w-64"
            aria-label={t.profile.chat.messages.spoilersLabel}
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
          label={t.profile.chat.messages.threadsSplitLabel}
          description={t.profile.chat.messages.threadsSplitDescription}
        >
          <Toggle
            label={t.profile.chat.messages.threadsSplitLabel}
            isSelected={prefs.threadsSplitView}
            onChange={(v) => updatePrefs({ threadsSplitView: v })}
          />
        </SettingsRow>
        <SettingsRow
          label={t.profile.chat.messages.avatarsLabel}
          description={
            avatarsLocked ? (
              <>
                {t.profile.chat.messages.avatarsHint.prefix}{' '}
                <button
                  type="button"
                  onClick={() => goTo('accessibility')}
                  className="cursor-pointer text-accent underline-offset-2 hover:underline"
                >
                  {t.profile.chat.messages.avatarsHint.link}
                </button>{' '}
                {t.profile.chat.messages.avatarsHint.middle} <strong className="font-medium">{t.profile.chat.messages.avatarsHint.compact}</strong> {t.profile.chat.messages.avatarsHint.suffix}
              </>
            ) : (
              t.profile.chat.messages.avatarsHintUnlocked
            )
          }
        >
          <Toggle
            label={t.profile.chat.messages.avatarsLabel}
            isSelected={avatarsLocked ? true : prefs.showAvatars}
            isDisabled={avatarsLocked}
            onChange={(v) => updatePrefs({ showAvatars: v })}
          />
        </SettingsRow>
      </SettingsSection>

      <section className="mb-8">
        <h3 className="mb-2 text-[13px] font-semibold tracking-wide text-foreground/90 uppercase">
          {t.profile.chat.relatedSettingsHeading}
        </h3>
        <RelatedSetting
          icon={Accessibility}
          title={t.profile.chat.relatedAccessibility.title}
          description={t.profile.chat.relatedAccessibility.description}
          tabId="accessibility"
        />
      </section>

      {/* ── Boîte de discussion ───────────────────────────────────────── */}
      <SettingsSection title={t.profile.chat.messageBox.sectionTitle}>
        <SettingsRow label={t.profile.chat.messageBox.previewSyntaxLabel}>
          <Toggle
            label={t.profile.chat.messageBox.previewSyntaxAriaLabel}
            isSelected={prefs.previewSyntax}
            onChange={(v) => updatePrefs({ previewSyntax: v })}
          />
        </SettingsRow>
        <SettingsRow
          label={t.profile.chat.messageBox.emoticonLabel}
          description={t.profile.chat.messageBox.emoticonDescription}
        >
          <Toggle
            label={t.profile.chat.messageBox.emoticonAriaLabel}
            isSelected={prefs.emoticonToEmoji}
            onChange={(v) => updatePrefs({ emoticonToEmoji: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messageBox.stickerLabel}>
          <Toggle
            label={t.profile.chat.messageBox.stickerAriaLabel}
            isSelected={prefs.stickerSuggestions}
            onChange={(v) => updatePrefs({ stickerSuggestions: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messageBox.commandsLabel}>
          <Toggle
            label={t.profile.chat.messageBox.commandsAriaLabel}
            isSelected={prefs.commandSuggestions}
            onChange={(v) => updatePrefs({ commandSuggestions: v })}
          />
        </SettingsRow>
        <SettingsRow label={t.profile.chat.messageBox.sendButtonLabel}>
          <Toggle
            label={t.profile.chat.messageBox.sendButtonAriaLabel}
            isSelected={prefs.showSendButton}
            onChange={(v) => updatePrefs({ showSendButton: v })}
          />
        </SettingsRow>
      </SettingsSection>

      {/* ── Recherche ─────────────────────────────────────────────────── */}
      <SettingsSection title={t.profile.chat.search.sectionTitle} description={t.profile.chat.search.sectionDescription}>
        <SettingsContent>
          <RadioGroup
            value={prefs.dmSearchScope}
            onChange={(v) => updatePrefs({ dmSearchScope: v as 'selected' | 'all' })}
            aria-label={t.profile.chat.search.ariaLabel}
            className="flex flex-col gap-1"
          >
            <Radio value="selected" className="w-full">
              <Radio.Content className="w-full rounded-md p-2.5 hover:bg-surface-secondary">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Label>{t.profile.chat.search.selectedOption}</Label>
              </Radio.Content>
            </Radio>
            <Radio value="all" className="w-full">
              <Radio.Content className="w-full rounded-md p-2.5 hover:bg-surface-secondary">
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Label>{t.profile.chat.search.allOption}</Label>
              </Radio.Content>
            </Radio>
          </RadioGroup>
        </SettingsContent>
      </SettingsSection>
    </div>
  );
}
