'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon, BotIcon, TerminalIcon, GlobeIcon, LinkIcon, LockIcon,
} from '@/components/icons';
import { MotionFade, MotionStagger, MotionStaggerItem } from '@/components/ui/motion-fade';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  InputGroup, InputGroupInput, InputGroupAddon,
} from '@/components/ui/input-group';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const AVAILABLE_TAGS = [
  'Modération', 'Musique', 'Jeux', 'Utilitaire', 'Fun',
  'Social', 'Économie', 'Niveaux', 'Logs', 'Sondages',
  'Notifications', 'Traduction', 'IA', 'Statistiques', 'Rôles',
];

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
      {message}
    </div>
  );
}

export default function NewBotPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    prefix: '!',
    isPublic: false,
    tags: [] as string[],
    websiteUrl: '',
    supportServerUrl: '',
    privacyPolicyUrl: '',
  });

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : prev.tags.length < 5 ? [...prev.tags, tag] : prev.tags,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setError('');
    setIsLoading(true);
    try {
      const res = await api.createBot(form);
      if (res.success && res.data) {
        const newBot = (res.data as any).bot;
        router.push(`/developers/bots/${newBot.id}`);
      } else {
        setError((res as any).error || 'Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Colonne gauche : formulaire */}
        <div className="flex flex-col bg-background">
          <div className="p-8 pb-0">
            <MotionFade direction="down" distance={6} duration={0.3}>
              <Link
                href="/developers/bots"
                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground no-underline"
              >
                <ArrowLeftIcon size={12} />
                Mes bots
              </Link>
            </MotionFade>
          </div>

          <div className="flex flex-1 items-start justify-center px-8 py-10">
            <div className="w-full max-w-sm">
              <MotionStagger className="flex flex-col gap-7">

                <MotionStaggerItem>
                  <h1 className="font-(family-name:--font-krona) text-2xl font-bold text-foreground">
                    Créer un bot
                  </h1>
                  <p className="mt-1.5 text-[13px] text-muted-foreground">
                    Enregistrez une nouvelle application bot sur AlfyChat.
                  </p>
                </MotionStaggerItem>

                <MotionStaggerItem>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {error && <ErrorBanner message={error} />}

                    {/* Identité */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Identité
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="name" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Nom du bot *
                        </label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            id="name"
                            placeholder="MonSuperBot"
                            required
                            maxLength={32}
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <BotIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="description" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Description
                        </label>
                        <textarea
                          id="description"
                          placeholder="Un bot qui fait des trucs géniaux..."
                          maxLength={500}
                          rows={3}
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring/30"
                        />
                      </div>
                    </div>

                    {/* Comportement */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Comportement
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="prefix" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Préfixe de commande
                        </label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            id="prefix"
                            placeholder="!"
                            maxLength={5}
                            value={form.prefix}
                            onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <TerminalIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2.5">
                        <div>
                          <p className="text-[13px] font-medium text-foreground">Bot public</p>
                          <p className="text-[11px] text-muted-foreground">Visible dans la liste publique des bots</p>
                        </div>
                        <Switch
                          checked={form.isPublic}
                          onCheckedChange={v => setForm(f => ({ ...f, isPublic: v }))}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Tags <span className="text-muted-foreground/40">(max 5)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {AVAILABLE_TAGS.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                              form.tags.includes(tag)
                                ? 'border-accent/30 bg-accent/15 text-accent'
                                : 'border-border/40 bg-background text-muted-foreground hover:border-accent/20 hover:text-foreground'
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Liens */}
                    <div className="space-y-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                        Liens (optionnel)
                      </p>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="websiteUrl" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Site web
                        </label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            id="websiteUrl"
                            type="url"
                            placeholder="https://monbot.fr"
                            value={form.websiteUrl}
                            onChange={e => setForm(f => ({ ...f, websiteUrl: e.target.value }))}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <GlobeIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="supportServerUrl" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Serveur support
                        </label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            id="supportServerUrl"
                            type="url"
                            placeholder="https://alfychat.app/invite/abc"
                            value={form.supportServerUrl}
                            onChange={e => setForm(f => ({ ...f, supportServerUrl: e.target.value }))}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <LinkIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label htmlFor="privacyPolicyUrl" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Politique de confidentialité
                        </label>
                        <InputGroup className="h-9">
                          <InputGroupInput
                            id="privacyPolicyUrl"
                            type="url"
                            placeholder="https://monbot.fr/privacy"
                            value={form.privacyPolicyUrl}
                            onChange={e => setForm(f => ({ ...f, privacyPolicyUrl: e.target.value }))}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-start">
                            <LockIcon size={14} className="text-muted-foreground/50" />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={isLoading || !form.name.trim()}
                    >
                      {isLoading && <Spinner className="size-4" />}
                      {isLoading ? 'Création en cours...' : 'Créer le bot'}
                    </Button>
                  </form>
                </MotionStaggerItem>
              </MotionStagger>
            </div>
          </div>
        </div>

        {/* Colonne droite : preview */}
        <div className="hidden bg-muted/20 p-8 lg:flex lg:items-center lg:justify-center">
          <MotionFade direction="left" distance={10} duration={0.4}>
            <div className="w-full max-w-xs space-y-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                Aperçu
              </p>
              {/* Preview card */}
              <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/40 bg-background">
                    <span className="text-base font-bold text-accent">
                      {form.name ? form.name[0]?.toUpperCase() : '?'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-foreground">
                        {form.name || 'Nom du bot'}
                      </span>
                      <Badge className="h-4 border border-border/40 bg-background px-1.5 text-[9px] text-muted-foreground">
                        BOT
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="size-1.5 rounded-full bg-gray-400" />
                      Hors ligne
                    </div>
                    {form.description ? (
                      <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                        {form.description}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[12px] text-muted-foreground/30 italic">
                        Ajoutez une description...
                      </p>
                    )}
                  </div>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-4 pb-3">
                    {form.tags.map(tag => (
                      <Badge key={tag} className="h-5 border border-accent/20 bg-accent/8 px-1.5 text-[10px] text-accent">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="border-t border-border/40 px-4 py-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    Préfixe : <span className="font-mono text-accent">{form.prefix || '!'}</span>
                    {form.isPublic && <span className="ml-2 text-muted-foreground/50">· Public</span>}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/40 text-center">
                Cet aperçu se met à jour en temps réel
              </p>
            </div>
          </MotionFade>
        </div>
      </div>
    </div>
  );
}
