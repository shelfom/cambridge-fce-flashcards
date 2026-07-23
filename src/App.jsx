import { useEffect, useMemo, useRef, useState } from "react";
import course from "./data/fce-course.json";

const STORAGE_KEY = "tb-cambridge-fce-course-progress-v1";
const FLIP_CLOSE_MS = 240;
const FLIP_OPEN_MS = 340;
const CELEBRATION_LOCK_MS = 520;
const ACCENTS = ["coral", "sun", "sky", "mint", "berry", "peach"];
const PEP_TALKS = {
  1: "First unit finished. Your new word world has opened its door!",
  2: "Two units strong. You are already building real FCE power!",
  3: "Unit 3 is yours. Small groups still make big achievements!",
  4: "Four units conquered. Your word lantern is glowing brighter!",
  5: "Fantastic focus. You stayed curious and finished every card!",
  6: "Six units complete. Your memory muscles are getting stronger!",
  7: "Lucky seven! These new words are becoming old friends.",
  8: "Eight units down. You kept going without rushing—excellent work!",
  9: "Unit 9 complete. Give your clever head a tiny victory nod!",
  10: "Ten whole units! That is a mountain of words climbed calmly.",
  11: "Wonderful work. Your English toolbox has another bright shelf!",
  12: "Halfway through all 24 units. That deserves a very big smile!",
  13: "Unit 13 conquered. Brave learners make tricky words feel friendly.",
  14: "Fourteen units strong. Your patience is turning into real skill!",
  15: "Great job. You listened, looked and learned like a word detective!",
  16: "Sixteen complete. Your growing vocabulary has real strength now.",
  17: "Unit 17 is finished. Quiet effort creates brilliant results!",
  18: "Eighteen units down. The finish line is getting wonderfully close!",
  19: "Excellent work. Another complete unit belongs to you forever!",
  20: "Twenty units! Your word treasure box is becoming impressively full.",
  21: "Only three units remain. Your steady effort is shining through!",
  22: "Twenty-two complete. You are stronger than every difficult word!",
  23: "One unit left. Take a proud breath—you have come so far!",
  24: "All 24 units complete! The whole FCE word adventure is yours."
};

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      <path d="M16 9c1.2 1.7 1.2 4.3 0 6M18.8 6.5c2.7 3.1 2.7 7.9 0 11" />
    </svg>
  );
}

function ArrowIcon({ direction = "right" }) {
  return (
    <svg className={direction === "left" ? "is-left" : ""} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </svg>
  );
}

function ThemeIcon({ theme }) {
  return theme === "dark" ? <span aria-hidden="true">☀</span> : <span aria-hidden="true">☾</span>;
}

function readState() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const id = course.groups.some((group) => group.id === String(value.unitId)) ? String(value.unitId) : "1";
    return {
      unitId: id,
      indexes: value.indexes && typeof value.indexes === "object" ? value.indexes : {},
      celebrating: Boolean(value.celebrating),
      theme: value.theme === "dark" ? "dark" : "light"
    };
  } catch {
    return { unitId: "1", indexes: {}, celebrating: false, theme: "light" };
  }
}

function visualWordWidth(word) {
  const narrow = { i: 0.55, l: 0.58, t: 0.68, f: 0.7, j: 0.7, r: 0.76, ".": 0.35, " ": 0.45 };
  return [...word.toLowerCase()].reduce((total, letter) => {
    if (letter === "m" || letter === "w") return total + 1.3;
    return total + (narrow[letter] || 1);
  }, 0);
}

function highlightTerms(card) {
  const base = card.headword
    .replace(/\b(?:sb|sth)\b/gi, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+or\s+/gi, "|")
    .split(/[|/]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 2);
  const spoken = card.spokenForm ? [card.spokenForm] : [];
  return [...new Set([...base, ...spoken])].sort((a, b) => b.length - a.length);
}

function exampleParts(card) {
  const forms = highlightTerms(card).map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!forms.length) return [card.example];
  const pattern = new RegExp(`(${forms.join("|")})`, "gi");
  return card.example.split(pattern);
}

export default function App() {
  const initial = useMemo(readState, []);
  const [unitId, setUnitId] = useState(initial.unitId);
  const [indexes, setIndexes] = useState(initial.indexes);
  const [cardIndex, setCardIndex] = useState(() => Number(initial.indexes[initial.unitId]) || 0);
  const [celebrating, setCelebrating] = useState(initial.celebrating);
  const [celebrationReady, setCelebrationReady] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [flipPhase, setFlipPhase] = useState("idle");
  const [theme, setTheme] = useState(initial.theme);
  const audioRef = useRef(null);
  const flipTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const celebrationPointerRef = useRef(false);

  const activeEntries = useMemo(() => course.entries.filter((entry) => String(entry.unit) === unitId), [unitId]);
  const activeLabel = `Unit ${unitId}`;
  const card = activeEntries[Math.min(cardIndex, Math.max(0, activeEntries.length - 1))] || course.entries[0];
  const progress = activeEntries.length ? ((cardIndex + 1) / activeEntries.length) * 100 : 0;
  const groupIndex = course.groups.findIndex((group) => group.id === unitId);
  const accent = ACCENTS[groupIndex % ACCENTS.length];
  const width = visualWordWidth(card.headword);
  const headwordSize = width >= 20 ? "is-very-long" : width >= 14 ? "is-long" : width >= 9 ? "is-wide" : "";
  const nextUnit = course.groups[groupIndex + 1]?.id;

  useEffect(() => {
    const storedIndex = Math.max(0, Math.min(activeEntries.length - 1, Number(indexes[unitId]) || 0));
    setCardIndex(storedIndex);
  }, [unitId, activeEntries.length]);

  useEffect(() => {
    const nextIndexes = { ...indexes, [unitId]: cardIndex };
    if (indexes[unitId] !== cardIndex) setIndexes(nextIndexes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ unitId, indexes: nextIndexes, celebrating, theme }));
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#111713" : "#fff7df");
  }, [unitId, cardIndex, celebrating, theme]);

  useEffect(() => {
    if (!celebrating) {
      setCelebrationReady(false);
      celebrationPointerRef.current = false;
      return;
    }
    setCelebrationReady(false);
    celebrationPointerRef.current = false;
    window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(() => setCelebrationReady(true), CELEBRATION_LOCK_MS);
  }, [celebrating]);

  useEffect(() => {
    if (celebrating || !activeEntries.length) return;
    const next = activeEntries[Math.min(cardIndex + 1, activeEntries.length - 1)];
    const image = new Image();
    image.src = next.image;
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = next.ukAudio;
  }, [cardIndex, activeEntries, celebrating]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (groupsOpen || sourcesOpen) {
        if (event.key === "Escape") {
          setGroupsOpen(false);
          setSourcesOpen(false);
        }
        return;
      }
      if (celebrating) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      } else if ((event.key === " " || event.key === "Enter") && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        requestFlip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  useEffect(() => () => {
    window.clearTimeout(flipTimerRef.current);
    window.clearTimeout(celebrationTimerRef.current);
    audioRef.current?.pause();
  }, []);

  function resetCardFace(nextFlipped = false) {
    window.clearTimeout(flipTimerRef.current);
    setFlipPhase("idle");
    setFlipped(nextFlipped);
    setSpeaking(false);
    setAudioError(false);
    audioRef.current?.pause();
  }

  function requestFlip() {
    if (flipPhase !== "idle" || celebrating) return;
    setFlipPhase("closing");
    window.clearTimeout(flipTimerRef.current);
    flipTimerRef.current = window.setTimeout(() => {
      setFlipped((value) => !value);
      setFlipPhase("opening");
      flipTimerRef.current = window.setTimeout(() => setFlipPhase("idle"), FLIP_OPEN_MS);
    }, FLIP_CLOSE_MS);
  }

  function goPrevious() {
    if (cardIndex === 0 || celebrating) return;
    setCardIndex((value) => value - 1);
    resetCardFace(false);
  }

  function goNext() {
    if (celebrating) return;
    if (cardIndex < activeEntries.length - 1) {
      setCardIndex((value) => value + 1);
      resetCardFace(false);
      return;
    }
    setCelebrating(true);
    resetCardFace(false);
  }

  function chooseUnit(nextId, allowCelebrationExit = false) {
    if (celebrating && !allowCelebrationExit) return;
    setUnitId(String(nextId));
    setCardIndex(Number(indexes[String(nextId)]) || 0);
    setCelebrating(false);
    setGroupsOpen(false);
    resetCardFace(false);
  }

  function armCelebrationContinue(event) {
    celebrationPointerRef.current = Boolean(celebrationReady && event.isTrusted && event.button === 0);
  }

  function disarmCelebrationContinue() {
    celebrationPointerRef.current = false;
  }

  function continueAfterCelebration(event) {
    const isFreshPointerClick = Boolean(celebrationReady && event?.isTrusted && celebrationPointerRef.current);
    celebrationPointerRef.current = false;
    if (!isFreshPointerClick) return;
    if (nextUnit) chooseUnit(nextUnit, true);
    else {
      setCelebrating(false);
      setGroupsOpen(true);
    }
  }

  function playPronunciation(event) {
    event.stopPropagation();
    audioRef.current?.pause();
    setAudioError(false);
    const audio = new Audio(card.ukAudio);
    audioRef.current = audio;
    setSpeaking(true);
    const finish = () => setSpeaking(false);
    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", () => { finish(); setAudioError(true); }, { once: true });
    audio.play().catch(() => { finish(); setAudioError(true); });
  }

  return (
    <div className={`app-shell accent-${accent}`} data-theme={theme}>
      <header className="topbar">
        <button className="brand" onClick={() => chooseUnit("1")} aria-label="Return to Unit 1" disabled={celebrating}>
          <span className="brand-title">Cambridge FCE</span>
          <span className="brand-subtitle">flashcards</span>
        </button>
        <div className="top-actions">
          <button className="theme-button" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`} disabled={celebrating}>
            <ThemeIcon theme={theme} />
          </button>
          <button className="quiet-button source-button" onClick={() => setSourcesOpen(true)} disabled={celebrating}>Sources</button>
          <button className="quiet-button browse-button" onClick={() => setGroupsOpen(true)} disabled={celebrating}>
            Browse units <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <main className={`practice ${celebrating ? "is-celebrating" : ""}`}>
        <div className="practice-meta">
          <div className="position"><span>{activeLabel}</span><span aria-hidden="true">/</span><span>card {cardIndex + 1} of {activeEntries.length}</span></div>
          <div className="total-progress">{cardIndex + 1} / {activeEntries.length}</div>
        </div>
        <div className="progress-track" aria-label={`${cardIndex + 1} of ${activeEntries.length} cards in ${activeLabel}`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <section className={`stage ${celebrating ? "is-celebrating" : ""}`}>
          {celebrating ? (
            <Celebration
              unitId={unitId}
              count={activeEntries.length}
              nextUnit={nextUnit}
              ready={celebrationReady}
              onArmContinue={armCelebrationContinue}
              onDisarmContinue={disarmCelebrationContinue}
              onContinue={continueAfterCelebration}
            />
          ) : (
            <div
              className={`flashcard ${flipped ? "is-flipped" : ""} is-flip-${flipPhase}`}
              onClick={requestFlip}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  requestFlip();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={flipped ? `Showing details for ${card.headword}. Tap to show the picture clue.` : `${card.headword}. Tap to show its meaning.`}
              aria-pressed={flipped}
              aria-busy={flipPhase !== "idle"}
            >
              <span className="card-rotor">
                {!flipped ? (
                  <span className="card-face card-front" key={`front-${card.slug}`}>
                    <span className="front-kicker">FCE word · {activeLabel}</span>
                    <span className="front-center">
                      <span className="clue-frame"><img src={card.image} alt={card.imageAlt} /></span>
                      <span className={`headword ${headwordSize}`}>{card.headword}</span>
                      <button
                        type="button"
                        className={`audio-button ${speaking ? "is-speaking" : ""} ${audioError ? "has-error" : ""}`}
                        onClick={playPronunciation}
                        aria-label={`Play British pronunciation of ${card.headword}`}
                      >
                        <SpeakerIcon />
                      </button>
                    </span>
                    <span className="flip-hint">tap the card to reveal</span>
                  </span>
                ) : (
                  <span className="card-face card-back" key={`back-${card.slug}`}>
                    <span className="back-topline">
                      <span className="back-word">{card.headword}</span>
                      <span className="part-of-speech">{card.partOfSpeech}</span>
                    </span>
                    <span className="chinese">{card.chineseGlosses.join(" · ")}</span>
                    <span className="detail-block meaning-block">
                      <span className="detail-label">Meaning</span>
                      <span className="definition">{card.definition}</span>
                    </span>
                    <span className="detail-block example-block">
                      <span className="detail-label">example</span>
                      <span className="example">
                        {exampleParts(card).map((part, index) =>
                          index % 2 === 1 ? <strong key={`${part}-${index}`}>{part}</strong> : <span key={`${part}-${index}`}>{part}</span>
                        )}
                      </span>
                    </span>
                    <span className="flip-hint">tap to see the picture clue</span>
                  </span>
                )}
              </span>
            </div>
          )}
        </section>

        {!celebrating && (
          <nav className="card-nav" aria-label="Flashcard navigation">
            <button className="nav-button" onClick={goPrevious} disabled={cardIndex === 0}>
              <ArrowIcon direction="left" /><span>Previous</span>
            </button>
            <button className="nav-button next-button" onClick={goNext}>
              <span>{cardIndex === activeEntries.length - 1 ? "Finish unit" : "Next"}</span><ArrowIcon />
            </button>
          </nav>
        )}
      </main>

      <footer className="footer">
        <span className="footer-contact">
          <span className="footer-brand">海归湾国际教育青少部</span>
          <a className="footer-phone" href="tel:4000616820" aria-label="Call 海归湾国际教育青少部 at 400-061-6820">400-061-6820</a>
        </span>
        <button onClick={() => setSourcesOpen(true)} disabled={celebrating}>Unofficial Objective First practice</button>
      </footer>

      {groupsOpen && <GroupDialog current={unitId} onChoose={chooseUnit} onClose={() => setGroupsOpen(false)} />}
      {sourcesOpen && <SourcesDialog onClose={() => setSourcesOpen(false)} />}
    </div>
  );
}

function Celebration({ unitId, count, nextUnit, ready, onArmContinue, onDisarmContinue, onContinue }) {
  const buttonText = nextUnit ? `Learn Unit ${nextUnit}` : "Browse all units";
  return (
    <div className="celebration-card" role="status" aria-live="polite" tabIndex={-1}>
      <span className="celebration-art" aria-hidden="true">{unitId}</span>
      <span className="celebration-kicker">Unit {unitId} complete</span>
      <h1>Congratulations!</h1>
      <p>{PEP_TALKS[Number(unitId)]}</p>
      <div className="celebration-stat"><strong>{count}</strong><span>words learned</span></div>
      <div className="celebration-actions">
        <button
          className="primary-button"
          onPointerDown={onArmContinue}
          onPointerCancel={onDisarmContinue}
          onClick={onContinue}
          disabled={!ready}
        >
          {buttonText} <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

function GroupDialog({ current, onChoose, onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="groups-title" onMouseDown={onClose}>
      <div className="modal groups-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="modal-kicker">complete course</span><h2 id="groups-title">Browse units</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="appendix-intro"><strong>24 source units</strong><span>418 new words after KET and PET</span></div>
        <div className="letter-grid unit-grid">
          {course.groups.map((group) => (
            <button key={group.id} className={`letter-tile unit-tile ${current === group.id ? "is-current" : ""}`} onClick={() => onChoose(group.id)}>
              <strong>{group.id}</strong><span>Unit {group.id} · {group.count} words</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourcesDialog({ onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="sources-title" onMouseDown={onClose}>
      <div className="modal sources-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="modal-kicker">source notes</span><h2 id="sources-title">About this course</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="source-copy">
          <p>These {course.totalEntries.toLocaleString()} cards follow the 24 units in the <em>Objective First Third Edition Wordlist with definitions</em>, Cambridge University Press 2012.</p>
          <p>The source contains 736 rows and 701 unique headwords or phrases. Every item already taught in Cambridge KET or PET Flashcards—including spelling, placeholder and separable phrasal-verb variants—has been removed.</p>
          <p>The source supplies definitions but no example sentences. This learning aid keeps the intended Cambridge sense while supplying tiny Chinese clues, easier English meanings and short child-readable examples.</p>
          <p>All clue scenes are original. Chinese glosses, simplified wording, examples, pep talks and natural British-female recordings were prepared for this unofficial learning aid. Cambridge does not endorse this product.</p>
          <a href="https://www.cambridge.org/" target="_blank" rel="noreferrer">Cambridge University Press ↗</a>
          <a href="https://www.cambridgeenglish.org/" target="_blank" rel="noreferrer">Cambridge English ↗</a>
        </div>
      </div>
    </div>
  );
}
