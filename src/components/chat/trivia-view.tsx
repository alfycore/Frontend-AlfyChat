'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MenuIcon, ZapIcon, StarIcon, CrownIcon, XIcon, CheckIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { useUIStyle } from '@/hooks/use-ui-style';
import { useMobileNav } from '@/hooks/use-mobile-nav';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface TriviaViewProps {
  serverId: string;
  channelId: string;
  channelName?: string;
}

interface Question {
  id: string;
  question: string;
  choices: string[];
  correct: number; // index
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

/* ── Question bank ──────────────────────────────────────────────────────────── */
const QUESTIONS: Question[] = [
  {
    id: 'q1', category: 'Culture générale', difficulty: 'easy',
    question: 'Quelle est la capitale de la France ?',
    choices: ['Lyon', 'Marseille', 'Paris', 'Bordeaux'],
    correct: 2,
    explanation: 'Paris est la capitale et la plus grande ville de France.',
  },
  {
    id: 'q2', category: 'Sciences', difficulty: 'easy',
    question: "Quelle est la formule chimique de l'eau ?",
    choices: ['CO₂', 'H₂O', 'NaCl', 'O₂'],
    correct: 1,
    explanation: "L'eau est composée de deux atomes d'hydrogène et un d'oxygène.",
  },
  {
    id: 'q3', category: 'Histoire', difficulty: 'medium',
    question: 'En quelle année a eu lieu la Révolution française ?',
    choices: ['1776', '1789', '1804', '1815'],
    correct: 1,
    explanation: 'La Révolution française a commencé en 1789 avec la prise de la Bastille.',
  },
  {
    id: 'q4', category: 'Géographie', difficulty: 'easy',
    question: 'Quel est le plus grand océan du monde ?',
    choices: ["Océan Atlantique", "Océan Indien", "Océan Arctique", "Océan Pacifique"],
    correct: 3,
    explanation: "Le Pacifique est le plus grand et le plus profond des océans.",
  },
  {
    id: 'q5', category: 'Jeux vidéo', difficulty: 'easy',
    question: 'Dans quel jeu joue-t-on le personnage de Master Chief ?',
    choices: ['Call of Duty', 'Halo', 'Destiny', 'Gears of War'],
    correct: 1,
    explanation: 'Master Chief est le protagoniste de la saga Halo de Microsoft.',
  },
  {
    id: 'q6', category: 'Mathématiques', difficulty: 'medium',
    question: "Combien vaut π (Pi) à 2 décimales près ?",
    choices: ['3.12', '3.14', '3.16', '3.18'],
    correct: 1,
    explanation: 'π ≈ 3.14159265…',
  },
  {
    id: 'q7', category: 'Musique', difficulty: 'easy',
    question: 'Combien de cordes possède une guitare classique ?',
    choices: ['4', '5', '6', '8'],
    correct: 2,
    explanation: 'Une guitare classique possède 6 cordes.',
  },
  {
    id: 'q8', category: 'Culture générale', difficulty: 'medium',
    question: "Quel pays a la plus grande superficie du monde ?",
    choices: ['Canada', 'Chine', 'États-Unis', 'Russie'],
    correct: 3,
    explanation: 'La Russie est le plus grand pays du monde avec ~17 millions de km².',
  },
  {
    id: 'q9', category: 'Sciences', difficulty: 'hard',
    question: "Quelle est la vitesse de la lumière dans le vide ?",
    choices: ['299 792 km/s', '300 000 km/s', '150 000 km/s', '3 000 000 km/s'],
    correct: 0,
    explanation: 'La vitesse exacte de la lumière est 299 792 458 m/s.',
  },
  {
    id: 'q10', category: 'Sport', difficulty: 'easy',
    question: 'Combien de joueurs composent une équipe de football sur le terrain ?',
    choices: ['9', '10', '11', '12'],
    correct: 2,
    explanation: 'Chaque équipe de football joue avec 11 joueurs sur le terrain.',
  },
  {
    id: 'q11', category: 'Technologie', difficulty: 'medium',
    question: "Que signifie l'acronyme HTML ?",
    choices: [
      'HyperText Markup Language',
      'High Transfer Model Language',
      'HyperText Media Link',
      'Home Tool Markup Language',
    ],
    correct: 0,
    explanation: "HTML = HyperText Markup Language, le langage de base du Web.",
  },
  {
    id: 'q12', category: 'Cinéma', difficulty: 'medium',
    question: "Qui a réalisé le film 'Inception' ?",
    choices: ['Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Ridley Scott'],
    correct: 1,
    explanation: "Inception (2010) a été réalisé par Christopher Nolan.",
  },
  {
    id: 'q13', category: 'Géographie', difficulty: 'hard',
    question: "Quelle est la plus haute montagne du monde ?",
    choices: ['K2', 'Mont Blanc', 'Everest', 'Kilimandjaro'],
    correct: 2,
    explanation: "L'Everest culmine à 8 848 m, c'est le plus haut sommet du monde.",
  },
  {
    id: 'q14', category: 'Jeux vidéo', difficulty: 'medium',
    question: "Dans quel jeu trouve-t-on des Pokémon ?",
    choices: ['Digimon World', 'Monster Hunter', 'Pokémon Rouge et Bleu', 'Dragon Quest Monsters'],
    correct: 2,
    explanation: "Pokémon Rouge et Bleu (1996) est le premier jeu de la franchise Pokémon.",
  },
  {
    id: 'q15', category: 'Histoire', difficulty: 'hard',
    question: "Qui était le premier Président des États-Unis ?",
    choices: ['Thomas Jefferson', 'George Washington', 'Abraham Lincoln', 'John Adams'],
    correct: 1,
    explanation: "George Washington est devenu le premier Président des États-Unis en 1789.",
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const TIMER_SECS = 20;
const POINTS: Record<Question['difficulty'], number> = { easy: 10, medium: 20, hard: 40 };

const DIFF_LABEL: Record<Question['difficulty'], string> = { easy: 'Facile', medium: 'Moyen', hard: 'Difficile' };
const DIFF_COLOR: Record<Question['difficulty'], string> = {
  easy:   'text-emerald-400 bg-emerald-400/10',
  medium: 'text-amber-400 bg-amber-400/10',
  hard:   'text-red-400 bg-red-400/10',
};

/* ── Category filter ────────────────────────────────────────────────────────── */
const ALL_CATEGORIES = Array.from(new Set(QUESTIONS.map((q) => q.category)));

/* ── Main component ─────────────────────────────────────────────────────────── */
export function TriviaView({ serverId, channelId, channelName }: TriviaViewProps) {
  const ui = useUIStyle();
  const { isMobile, toggleSidebar } = useMobileNav();

  // Game state
  type GameState = 'menu' | 'playing' | 'answered' | 'results';
  const [state, setState] = useState<GameState>('menu');
  const [category, setCategory] = useState<string>('all');
  const [deck, setDeck] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bonusUsed, setBonusUsed] = useState(false);
  const [timer, setTimer] = useState(TIMER_SECS);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [history, setHistory] = useState<{ q: Question; chosen: number | null; correct: boolean }[]>([]);

  const currentQ = deck[qIndex] ?? null;

  /* Timer */
  useEffect(() => {
    if (state !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimer(TIMER_SECS);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setTimedOut(true);
          setState('answered');
          setHistory((h) => [...h, { q: currentQ!, chosen: null, correct: false }]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state, qIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = () => {
    const pool = category === 'all'
      ? QUESTIONS
      : QUESTIONS.filter((q) => q.category === category);
    const shuffled = shuffle(pool).slice(0, 10);
    setDeck(shuffled);
    setQIndex(0);
    setScore(0);
    setSelected(null);
    setTimedOut(false);
    setBonusUsed(false);
    setHistory([]);
    setState('playing');
  };

  const answer = (idx: number) => {
    if (state !== 'playing') return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(idx);
    const correct = idx === currentQ!.correct;
    if (correct) {
      const bonus = timer > 10 ? POINTS[currentQ!.difficulty] * 1.5 : POINTS[currentQ!.difficulty];
      setScore((s) => s + Math.round(bonus));
    }
    setHistory((h) => [...h, { q: currentQ!, chosen: idx, correct }]);
    setState('answered');
  };

  const nextQuestion = () => {
    if (qIndex + 1 >= deck.length) {
      setState('results');
      return;
    }
    setQIndex((i) => i + 1);
    setSelected(null);
    setTimedOut(false);
    setState('playing');
  };

  /* ── Menu ── */
  if (state === 'menu') {
    return (
      <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
        <Header ui={ui} isMobile={isMobile} toggleSidebar={toggleSidebar} channelName={channelName} />
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-lg p-6">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-[20px] bg-yellow-400/15">
                <span className="text-3xl">🧠</span>
              </div>
              <h2 className="text-[22px] font-bold tracking-tight text-foreground">Trivia</h2>
              <p className="mt-1 text-[13px] text-muted-foreground">10 questions · Réponds avant le chrono !</p>
            </div>

            {/* Category */}
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">CATÉGORIE</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategory('all')}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-all',
                    category === 'all'
                      ? 'border-yellow-400/50 bg-yellow-400/15 text-yellow-400'
                      : 'border-border/40 text-muted-foreground hover:border-yellow-400/30 hover:text-foreground',
                  )}
                >
                  Toutes
                </button>
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-all',
                      category === cat
                        ? 'border-yellow-400/50 bg-yellow-400/15 text-yellow-400'
                        : 'border-border/40 text-muted-foreground hover:border-yellow-400/30 hover:text-foreground',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Points info */}
            <div className="mb-6 grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <div key={d} className={cn('rounded-xl border border-border/30 p-3 text-center', ui.isGlass ? 'bg-white/5' : 'bg-card/60')}>
                  <p className={cn('text-[11px] font-semibold', DIFF_COLOR[d].split(' ')[0])}>{DIFF_LABEL[d]}</p>
                  <p className="text-[18px] font-black text-foreground">{POINTS[d]}</p>
                  <p className="text-[10px] text-muted-foreground">pts</p>
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full rounded-2xl bg-yellow-400/15 py-3 text-[15px] font-bold text-yellow-400 transition-all hover:bg-yellow-400/25 active:scale-95"
            >
              🚀 Démarrer
            </button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  /* ── Results ── */
  if (state === 'results') {
    const total = deck.length;
    const correct = history.filter((h) => h.correct).length;
    const pct = Math.round((correct / total) * 100);
    return (
      <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
        <Header ui={ui} isMobile={isMobile} toggleSidebar={toggleSidebar} channelName={channelName} />
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-lg p-6">
            <div className="mb-6 text-center">
              <span className="text-5xl">{pct >= 80 ? '🏆' : pct >= 50 ? '🎉' : '😅'}</span>
              <h2 className="mt-3 text-[22px] font-bold text-foreground">
                {pct >= 80 ? 'Excellent !' : pct >= 50 ? 'Bien joué !' : 'Pas mal…'}
              </h2>
              <p className="text-[28px] font-black text-yellow-400">{score} pts</p>
              <p className="text-[13px] text-muted-foreground">{correct}/{total} bonnes réponses ({pct}%)</p>
            </div>

            {/* Answers recap */}
            <div className="space-y-2 mb-6">
              {history.map(({ q, chosen, correct: isCorrect }, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl border p-3',
                    isCorrect
                      ? 'border-emerald-400/30 bg-emerald-400/8'
                      : 'border-red-400/30 bg-red-400/8',
                  )}
                >
                  <p className="text-[12px] font-medium text-foreground line-clamp-2">{q.question}</p>
                  <p className={cn('mt-1 text-[11px]', isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                    {isCorrect ? '✅' : '❌'} {q.choices[q.correct]}
                    {!isCorrect && chosen !== null && (
                      <span className="text-muted-foreground"> · Ta réponse : {q.choices[chosen]}</span>
                    )}
                    {chosen === null && <span className="text-muted-foreground"> · Temps écoulé</span>}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setState('menu')}
              className="w-full rounded-2xl bg-yellow-400/15 py-3 text-[14px] font-bold text-yellow-400 hover:bg-yellow-400/25"
            >
              Rejouer
            </button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  /* ── Playing / Answered ── */
  if (!currentQ) return null;
  const progress = ((qIndex + 1) / deck.length) * 100;

  return (
    <div className={`flex h-full min-h-0 flex-col ${ui.contentBg}`}>
      <Header ui={ui} isMobile={isMobile} toggleSidebar={toggleSidebar} channelName={channelName} onExit={() => setState('menu')} />

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-lg p-5">

          {/* Progress + timer */}
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 h-1.5 rounded-full bg-border/40">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-yellow-400/70 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{qIndex + 1}/{deck.length}</span>
            <div className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-xl text-[14px] font-bold transition-colors',
              state === 'playing'
                ? timer <= 5
                  ? 'bg-red-400/20 text-red-400'
                  : 'bg-yellow-400/15 text-yellow-400'
                : 'bg-muted/30 text-muted-foreground',
            )}>
              {state === 'playing' ? timer : '—'}
            </div>
          </div>

          {/* Score + category + difficulty */}
          <div className="mb-4 flex items-center gap-2">
            <span className={cn('rounded-lg px-2 py-0.5 text-[10px] font-semibold', DIFF_COLOR[currentQ.difficulty])}>
              {DIFF_LABEL[currentQ.difficulty]}
            </span>
            <span className="text-[11px] text-muted-foreground">{currentQ.category}</span>
            <span className="ml-auto text-[11px] font-bold text-yellow-400">{score} pts</span>
          </div>

          {/* Question */}
          <div className={cn(
            'mb-5 rounded-2xl border p-5',
            ui.isGlass ? 'border-white/12 bg-white/7 backdrop-blur-xl' : 'border-border/40 bg-card/60',
          )}>
            <p className="text-[16px] font-semibold leading-snug text-foreground">{currentQ.question}</p>
          </div>

          {/* Choices */}
          <div className="space-y-2">
            {currentQ.choices.map((choice, idx) => {
              let cls = 'border-border/40 bg-card/60 text-foreground hover:border-yellow-400/40 hover:bg-yellow-400/8';
              if (state === 'answered' || timedOut) {
                if (idx === currentQ.correct) {
                  cls = 'border-emerald-400/50 bg-emerald-400/12 text-emerald-400 font-semibold';
                } else if (idx === selected) {
                  cls = 'border-red-400/50 bg-red-400/12 text-red-400';
                } else {
                  cls = 'border-border/20 bg-card/30 text-muted-foreground opacity-60';
                }
              }
              return (
                <button
                  key={idx}
                  onClick={() => answer(idx)}
                  disabled={state === 'answered' || timedOut}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                    cls,
                  )}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-border/30 text-[11px] font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-[13px]">{choice}</span>
                  {state === 'answered' && idx === currentQ.correct && (
                    <CheckIcon size={14} className="ml-auto text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation + next */}
          {(state === 'answered' || timedOut) && (
            <div className="mt-4 space-y-3">
              {currentQ.explanation && (
                <div className="rounded-xl border border-border/30 bg-card/50 px-4 py-3">
                  <p className="text-[11px] font-semibold text-muted-foreground">EXPLICATION</p>
                  <p className="mt-0.5 text-[12px] text-foreground/80">{currentQ.explanation}</p>
                </div>
              )}
              {timedOut && (
                <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-[12px] text-red-400">
                  ⏱ Temps écoulé ! La bonne réponse était : {currentQ.choices[currentQ.correct]}
                </div>
              )}
              <button
                onClick={nextQuestion}
                className="w-full rounded-2xl bg-yellow-400/15 py-3 text-[14px] font-bold text-yellow-400 hover:bg-yellow-400/25"
              >
                {qIndex + 1 < deck.length ? 'Question suivante →' : 'Voir les résultats →'}
              </button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ── Header subcomponent ────────────────────────────────────────────────────── */
function Header({
  ui, isMobile, toggleSidebar, channelName, onExit,
}: {
  ui: ReturnType<typeof useUIStyle>;
  isMobile: boolean;
  toggleSidebar: () => void;
  channelName?: string;
  onExit?: () => void;
}) {
  return (
    <div className={`flex h-14 shrink-0 items-center gap-2.5 px-3 ${ui.header}`}>
      {isMobile && (
        <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={toggleSidebar}>
          <MenuIcon size={16} />
        </Button>
      )}
      {onExit && (
        <Button size="icon-sm" variant="ghost" className="size-8 shrink-0 rounded-xl text-muted-foreground" onClick={onExit}>
          <XIcon size={16} />
        </Button>
      )}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-yellow-400/15">
        <span style={{ fontSize: 13 }}>🧠</span>
      </div>
      <h2 className="flex-1 truncate text-[14px] font-semibold text-foreground">{channelName || 'trivia'}</h2>
    </div>
  );
}
