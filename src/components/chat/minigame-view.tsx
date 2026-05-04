'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Gamepad2Icon, MenuIcon, ZapIcon, StarIcon, CrownIcon, XIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface MinigameViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

type GameId = 'rps' | 'dice' | 'hangman' | 'higher-lower';

/* ── Rock-Paper-Scissors ────────────────────────────────────────────────────── */
type RPSChoice = 'rock' | 'paper' | 'scissors';
const RPS_CHOICES: { id: RPSChoice; emoji: string; label: string }[] = [
  { id: 'rock',     emoji: '🪨', label: 'Pierre' },
  { id: 'paper',    emoji: '📄', label: 'Papier' },
  { id: 'scissors', emoji: '✂️', label: 'Ciseaux' },
];
function getRPSWinner(player: RPSChoice, cpu: RPSChoice): 'win' | 'lose' | 'draw' {
  if (player === cpu) return 'draw';
  if (
    (player === 'rock'     && cpu === 'scissors') ||
    (player === 'paper'    && cpu === 'rock')     ||
    (player === 'scissors' && cpu === 'paper')
  ) return 'win';
  return 'lose';
}

function RPSGame() {
  const [choice, setChoice] = useState<RPSChoice | null>(null);
  const [cpu, setCpu] = useState<RPSChoice | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [score, setScore] = useState({ wins: 0, losses: 0, draws: 0 });
  const [animating, setAnimating] = useState(false);

  const play = (c: RPSChoice) => {
    if (animating) return;
    setAnimating(true);
    setChoice(c);
    setCpu(null);
    setResult(null);

    setTimeout(() => {
      const cpuChoice = RPS_CHOICES[Math.floor(Math.random() * 3)].id;
      const res = getRPSWinner(c, cpuChoice);
      setCpu(cpuChoice);
      setResult(res);
      setScore((s) => ({
        wins:   s.wins   + (res === 'win'  ? 1 : 0),
        losses: s.losses + (res === 'lose' ? 1 : 0),
        draws:  s.draws  + (res === 'draw' ? 1 : 0),
      }));
      setAnimating(false);
    }, 600);
  };

  const reset = () => { setChoice(null); setCpu(null); setResult(null); };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Score */}
      <div className="flex gap-6 text-center">
        <div>
          <p className="text-[22px] font-bold text-emerald-400">{score.wins}</p>
          <p className="text-[11px] text-muted-foreground">Victoires</p>
        </div>
        <div>
          <p className="text-[22px] font-bold text-muted-foreground">{score.draws}</p>
          <p className="text-[11px] text-muted-foreground">Nuls</p>
        </div>
        <div>
          <p className="text-[22px] font-bold text-red-400">{score.losses}</p>
          <p className="text-[11px] text-muted-foreground">Défaites</p>
        </div>
      </div>

      {/* Arena */}
      <div className="flex w-full max-w-xs items-center justify-between rounded-2xl border border-border/40 bg-card/60 px-6 py-5">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">Toi</span>
          <span className={cn('text-5xl transition-all duration-300', animating && 'animate-bounce')}>
            {choice ? RPS_CHOICES.find(c => c.id === choice)!.emoji : '❓'}
          </span>
        </div>
        <span className="text-[18px] font-bold text-muted-foreground/50">VS</span>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-medium text-muted-foreground">CPU</span>
          <span className={cn('text-5xl transition-all duration-300', animating && 'animate-bounce')}>
            {animating ? '🤔' : cpu ? RPS_CHOICES.find(c => c.id === cpu)!.emoji : '❓'}
          </span>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className={cn(
          'rounded-2xl px-6 py-3 text-center font-bold',
          result === 'win'  && 'bg-emerald-400/15 text-emerald-400',
          result === 'lose' && 'bg-red-400/15 text-red-400',
          result === 'draw' && 'bg-muted/30 text-muted-foreground',
        )}>
          {result === 'win' ? '🎉 Tu as gagné !' : result === 'lose' ? '😔 Tu as perdu' : '🤝 Égalité !'}
        </div>
      )}

      {/* Choices */}
      <div className="flex gap-3">
        {RPS_CHOICES.map((c) => (
          <button
            key={c.id}
            onClick={() => play(c.id)}
            disabled={animating}
            className={cn(
              'flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 text-center transition-all',
              'border-border/40 bg-card/60 hover:border-indigo-400/50 hover:bg-indigo-400/10',
              animating && 'cursor-not-allowed opacity-50',
            )}
          >
            <span className="text-3xl">{c.emoji}</span>
            <span className="text-[11px] font-medium text-muted-foreground">{c.label}</span>
          </button>
        ))}
      </div>

      {choice && !animating && (
        <button onClick={reset} className="text-[12px] text-muted-foreground hover:text-foreground">
          Rejouer
        </button>
      )}
    </div>
  );
}

/* ── Dice ───────────────────────────────────────────────────────────────────── */
const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];

function DiceGame() {
  const [value, setValue] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [rolling, setRolling] = useState(false);
  const [diceCount, setDiceCount] = useState(1);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setValue(null);

    const interval = setInterval(() => {
      setValue(Math.floor(Math.random() * 6) + 1);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      const final = Math.floor(Math.random() * 6) + 1;
      setValue(final);
      setHistory((h) => [final, ...h.slice(0, 9)]);
      setRolling(false);
    }, 700);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Dice display */}
      <button
        onClick={roll}
        disabled={rolling}
        className={cn(
          'flex size-28 items-center justify-center rounded-3xl border-2 border-indigo-400/40 bg-indigo-400/10 text-7xl transition-all',
          'hover:border-indigo-400/60 hover:bg-indigo-400/15 active:scale-95',
          rolling && 'animate-spin cursor-wait',
        )}
      >
        {value ? DICE_FACES[value - 1] : '🎲'}
      </button>
      <p className="text-[13px] text-muted-foreground">
        {rolling ? 'Lancement…' : value ? `Résultat : ${value}` : 'Clique pour lancer'}
      </p>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-xs">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Historique</p>
          <div className="flex flex-wrap gap-2">
            {history.map((v, i) => (
              <span key={i} className="flex size-9 items-center justify-center rounded-xl bg-card/60 border border-border/40 text-lg">
                {DICE_FACES[v - 1]}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Moyenne : {(history.reduce((a, b) => a + b, 0) / history.length).toFixed(1)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Higher or Lower ────────────────────────────────────────────────────────── */
function HigherLowerGame() {
  const [current, setCurrent] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [next, setNext] = useState(() => Math.floor(Math.random() * 100) + 1);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'win' | 'lose' | null>(null);
  const [revealed, setRevealed] = useState(false);

  const guess = (isHigher: boolean) => {
    if (revealed) return;
    const correct = isHigher ? next > current : next < current;
    setRevealed(true);
    if (correct) {
      setResult('win');
      setScore((s) => s + 1);
    } else {
      setResult('lose');
    }
  };

  const next_ = () => {
    if (result === 'lose') {
      setCurrent(Math.floor(Math.random() * 100) + 1);
      setScore(0);
    } else {
      setCurrent(next);
    }
    setNext(Math.floor(Math.random() * 100) + 1);
    setResult(null);
    setRevealed(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="flex items-center gap-1 text-[13px]">
        <ZapIcon size={13} className="text-yellow-400" />
        <span className="font-bold text-yellow-400">{score}</span>
        <span className="text-muted-foreground ml-1">points</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-muted-foreground">Carte actuelle</p>
          <div className="flex size-24 items-center justify-center rounded-2xl border-2 border-border/40 bg-card/60 text-4xl font-black text-foreground">
            {current}
          </div>
        </div>
        <span className="text-[22px] text-muted-foreground/40">→</span>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-muted-foreground">Prochaine</p>
          <div className={cn(
            'flex size-24 items-center justify-center rounded-2xl border-2 text-4xl font-black transition-all',
            revealed
              ? result === 'win'
                ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-400'
                : 'border-red-400/60 bg-red-400/10 text-red-400'
              : 'border-border/40 bg-card/60 text-foreground',
          )}>
            {revealed ? next : '?'}
          </div>
        </div>
      </div>

      {!revealed ? (
        <div className="flex gap-3">
          <button
            onClick={() => guess(false)}
            className="flex h-10 items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/10 px-5 text-[13px] font-semibold text-blue-400 hover:bg-blue-400/20"
          >
            ⬇ Plus bas
          </button>
          <button
            onClick={() => guess(true)}
            className="flex h-10 items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 px-5 text-[13px] font-semibold text-rose-400 hover:bg-rose-400/20"
          >
            ⬆ Plus haut
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'rounded-xl px-5 py-2 text-[13px] font-bold',
            result === 'win' ? 'bg-emerald-400/15 text-emerald-400' : 'bg-red-400/15 text-red-400',
          )}>
            {result === 'win' ? '✅ Bonne réponse !' : `❌ Perdu ! Le prochain était ${next}`}
          </div>
          <button onClick={next_} className="text-[12px] text-muted-foreground hover:text-foreground">
            {result === 'lose' ? 'Recommencer' : 'Continuer →'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Game selector ──────────────────────────────────────────────────────────── */
const GAMES: { id: GameId; emoji: string; label: string; desc: string; color: string }[] = [
  { id: 'rps',          emoji: '🪨', label: 'Pierre-Papier-Ciseaux', desc: 'Affronte le CPU !',         color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30' },
  { id: 'dice',         emoji: '🎲', label: 'Lancer de dés',          desc: 'Lance les dés !',           color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { id: 'higher-lower', emoji: '🃏', label: 'Plus haut ou plus bas',   desc: 'Devine le prochain chiffre !', color: 'text-rose-400 bg-rose-400/10 border-rose-400/30' },
];

/* ── Main ───────────────────────────────────────────────────────────────────── */
export function MinigameView({ serverId, channelId, channelName }: MinigameViewProps) {
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const game = GAMES.find((g) => g.id === activeGame);

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      {/* Header */}
      <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
        {isMobile && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
            <MenuIcon size={16} />
          </Button>
        )}
        {activeGame && (
          <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={() => setActiveGame(null)}>
            <XIcon size={16} />
          </Button>
        )}
        <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-indigo-400/15">
          <Gamepad2Icon size={13} className="text-indigo-400" />
        </div>
        <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">
          {game ? game.label : (channelName || 'mini-jeux')}
        </h2>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {!activeGame ? (
          /* ── Game selector ── */
          <div className="p-5">
            <p className="mb-4 text-[13px] text-muted-foreground">Choisissez un jeu&nbsp;:</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {GAMES.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGame(g.id)}
                  className={cn(
                    'flex flex-col gap-3 rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                    ui.isGlass
                      ? 'border-white/12 bg-white/7 backdrop-blur-xl hover:bg-white/12'
                      : 'border-border/40 bg-card/60 hover:bg-card hover:border-indigo-400/30',
                  )}
                >
                  <span className="text-3xl">{g.emoji}</span>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{g.label}</p>
                    <p className="text-[12px] text-muted-foreground">{g.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Coming soon */}
            <p className="mt-6 text-[11px] text-muted-foreground/60">Plus de jeux à venir…</p>
          </div>
        ) : (
          /* ── Active game ── */
          <div className="px-4">
            {activeGame === 'rps'          && <RPSGame />}
            {activeGame === 'dice'         && <DiceGame />}
            {activeGame === 'higher-lower' && <HigherLowerGame />}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
