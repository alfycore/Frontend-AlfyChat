'use client';

import { useState, useEffect } from 'react';
import { hostingApi, BoostSummary } from '@/lib/hosting-api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BoostModalProps {
  serverId: string;
  open: boolean;
  onClose: () => void;
}

const BOOST_LEVELS = [
  { level: 0, name: 'Niveau 0', boosts: 0, icon: '⚪', unlocks: [] },
  { level: 1, name: 'Niveau 1', boosts: 2, icon: '🔵', unlocks: ['Icône animée', 'Emoji personnalisés (50)'] },
  { level: 2, name: 'Niveau 2', boosts: 7, icon: '🟣', unlocks: ['Bannière du serveur', 'Emoji personnalisés (100)', 'Max membres +50%'] },
  { level: 3, name: 'Niveau 3', boosts: 14, icon: '🟡', unlocks: ['Toutes les fonctionnalités', 'Emoji personnalisés (250)', 'Stickers personnalisés', 'Splashscreen', 'Max membres x2'] },
];

export function BoostServerModal({ serverId, open, onClose }: BoostModalProps) {
  const [summary, setSummary] = useState<BoostSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [boosting, setBoosting] = useState(false);

  useEffect(() => {
    if (open) loadSummary();
  }, [open, serverId]);

  async function loadSummary() {
    setLoading(true);
    try {
      const res: any = await hostingApi.getBoosts(serverId);
      setSummary(res?.data ?? res);
    } catch {
      toast.error('Impossible de charger les boosts');
    } finally {
      setLoading(false);
    }
  }

  async function doBoost(slots: number) {
    setBoosting(true);
    try {
      await hostingApi.boostServer(serverId, { boost_type: 'user', boost_slots: slots });
      toast.success('Boost appliqué !');
      await loadSummary();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur boost');
    } finally {
      setBoosting(false);
    }
  }

  if (!open) return null;

  const currentLevel = summary?.boost_level ?? 0;
  const totalBoosts = summary?.total_boosts ?? 0;
  const nextLevel = BOOST_LEVELS[currentLevel + 1];
  const boostsToNext = nextLevel ? nextLevel.boosts - totalBoosts : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-linear-to-r from-indigo-600/30 to-purple-600/30 p-6 text-center border-b border-white/10">
          <div className="text-4xl mb-2">{BOOST_LEVELS[currentLevel].icon}</div>
          <h2 className="text-xl font-bold">Booster le serveur</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Niveau actuel : <span className="font-semibold text-foreground">{BOOST_LEVELS[currentLevel].name}</span>
          </p>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <i className="bi bi-arrow-repeat animate-spin text-2xl text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Barre de progression */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{totalBoosts} boosts utilisés</span>
                  {nextLevel && <span>{nextLevel.boosts} boosts pour le niveau {currentLevel + 1}</span>}
                </div>
                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${nextLevel ? Math.min((totalBoosts / nextLevel.boosts) * 100, 100) : 100}%` }}
                  />
                </div>
                {nextLevel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Encore <span className="text-foreground font-medium">{boostsToNext} boost{boostsToNext > 1 ? 's' : ''}</span> pour débloquer le niveau {currentLevel + 1}
                  </p>
                )}
              </div>

              {/* Paliers */}
              <div className="space-y-2">
                {BOOST_LEVELS.slice(1).map(lvl => (
                  <div
                    key={lvl.level}
                    className={`rounded-xl p-3 border transition-colors ${
                      currentLevel >= lvl.level
                        ? 'border-indigo-500/40 bg-indigo-500/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{lvl.icon}</span>
                      <span className="font-medium text-sm">{lvl.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{lvl.boosts} boosts</span>
                      {currentLevel >= lvl.level && (
                        <span className="text-xs text-emerald-400"><i className="bi bi-check-circle-fill" /></span>
                      )}
                    </div>
                    <ul className="space-y-0.5">
                      {lvl.unlocks.map(u => (
                        <li key={u} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <i className={`bi bi-${currentLevel >= lvl.level ? 'check' : 'lock'} text-${currentLevel >= lvl.level ? 'emerald-400' : 'muted-foreground'}`} />
                          {u}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* CTA Boost */}
              {nextLevel && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs text-muted-foreground text-center">
                    Ajouter des boosts pour progresser vers le niveau {currentLevel + 1}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 5].map(n => (
                      <Button
                        key={n}
                        variant="outline"
                        size="sm"
                        disabled={boosting}
                        onClick={() => doBoost(n)}
                        className="border-indigo-500/30 hover:bg-indigo-500/20 hover:border-indigo-500"
                      >
                        +{n} boost{n > 1 ? 's' : ''}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {!nextLevel && (
                <div className="text-center py-2">
                  <p className="text-sm text-emerald-400 font-medium">
                    <i className="bi bi-trophy-fill mr-2" />Niveau maximum atteint !
                  </p>
                </div>
              )}
            </>
          )}

          <Button variant="ghost" className="w-full" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </div>
  );
}
