import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from '@getpapillon/papicons';
import AutoAdvanceToggle from './AutoAdvanceToggle.jsx';
import { formatSeconds } from '../../utils/time.js';

// Temps restant lisible : « dans 3 min », « à l'arrêt », « passé »
function relativeLabel(diff) {
  if (diff === null) return '';
  if (diff < -45) return 'passé';
  if (diff <= 10) return 'à l’arrêt';
  if (diff < 60) return `dans ${diff} s`;
  return `dans ${Math.round(diff / 60)} min`;
}

// Onglet « Arrêts » : thermomètre de ligne du service en cours
export default function StopsTab({ svc }) {
  const {
    currentStopIndex,
    selectedTrip,
    activeTripStops,
    isInService,
    getAdjustedStopTime,
    delayMinutes,
    departureAnalysis,
    activeLine,
    goToStop,
    secondsUntilStop,
    autoAdvance,
  } = svc;

  const listRef = useRef(null);
  const currentRef = useRef(null);
  const lineColor = activeLine?.color || '#DAE44E';
  const stopsCount = activeTripStops.length;
  const lastStop = activeTripStops[stopsCount - 1];
  const nextStop = isInService ? activeTripStops[currentStopIndex] : activeTripStops[0];
  const nextDiff = nextStop ? secondsUntilStop(nextStop.time) : null;
  const terminusDiff = lastStop ? secondsUntilStop(lastStop.time) : null;
  const progress = stopsCount ? Math.round(((isInService ? currentStopIndex : 0) / Math.max(1, stopsCount - 1)) * 100) : 0;

  // Garde l'arrêt en cours au centre de la liste (sans faire défiler la page)
  useEffect(() => {
    const list = listRef.current;
    const row = currentRef.current;
    if (!list || !row) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({
      top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2,
      behavior: reduce ? 'auto' : 'smooth'
    });
  }, [currentStopIndex, isInService]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

      {/* Résumé : sous la liste sur mobile, colonne collante sur PC */}
      <aside className="lg:col-span-4 order-2 lg:sticky lg:top-20 space-y-4">
        <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-4">
          <div>
            <span className="text-sm text-zinc-400">
              {!isInService ? 'Départ' : nextStop === lastStop ? 'Terminus' : 'Prochain arrêt'}
            </span>
            <div className="font-sign text-3xl font-bold uppercase leading-tight text-white mt-0.5">
              {nextStop?.stop || '—'}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-mono font-semibold text-lg text-white">{getAdjustedStopTime(nextStop?.time)}</span>
              <span className="text-sm font-semibold text-sse-yellow">
                {!isInService ? `dans ${departureAnalysis.countdownText}` : relativeLabel(nextDiff)}
              </span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Progression</span>
              <span className="font-mono text-zinc-200">
                {isInService ? `Arrêt ${currentStopIndex + 1} sur ${stopsCount}` : `${stopsCount} arrêts`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-sse-raised mt-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: lineColor }} />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-400">Arrivée terminus</dt>
              <dd className="font-mono font-semibold text-white">
                {getAdjustedStopTime(lastStop?.time)}
                {terminusDiff !== null && terminusDiff > 0 && (
                  <span className="block text-xs font-sans font-normal text-zinc-400">dans {formatSeconds(terminusDiff)}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Régulation</dt>
              <dd className={`font-semibold ${delayMinutes > 0 ? 'text-amber-300' : 'text-white'}`}>
                {delayMinutes === 0 ? 'À l’heure' : delayMinutes > 0 ? `+${delayMinutes} min` : `${delayMinutes} min`}
              </dd>
            </div>
          </dl>

          {isInService && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => goToStop(currentStopIndex - 1)}
                disabled={currentStopIndex === 0}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-md border border-white/15 text-sm font-semibold text-white hover:border-white disabled:opacity-30"
              >
                <ChevronLeft size={16} /> Précédent
              </button>
              <button
                type="button"
                onClick={() => goToStop(currentStopIndex + 1)}
                disabled={currentStopIndex >= stopsCount - 1}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-md border border-white/15 text-sm font-semibold text-white hover:border-white disabled:opacity-30"
              >
                Suivant <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-white/10">
            <AutoAdvanceToggle svc={svc} />
          </div>
        </div>
      </aside>

      {/* Thermomètre de ligne */}
      <section className="lg:col-span-8 order-1 bg-sse-panel border border-white/10 rounded-xl overflow-hidden" aria-label="Arrêts du service">
        <header className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-zinc-300">
            {stopsCount} arrêts, {selectedTrip?.isLimitedService ? 'service partiel' : 'service complet'}
          </h3>
          <span className="text-xs text-zinc-400 hidden sm:block">
            {isInService
              ? autoAdvance ? 'Défilement automatique actif' : 'Touchez un arrêt pour vous y placer'
              : 'Avant le départ'}
          </span>
        </header>

        <ol
          ref={listRef}
          className="relative overflow-y-auto custom-scrollbar max-h-[60vh] lg:max-h-[calc(100vh-300px)] min-h-[320px] py-2"
        >
          {activeTripStops.map((s, idx) => {
            const isPassed = isInService && idx < currentStopIndex;
            const isCurrent = isInService && idx === currentStopIndex;
            const isFirst = idx === 0;
            const isLast = idx === stopsCount - 1;
            const isTerminus = isFirst || isLast;
            const diff = secondsUntilStop(s.time);
            // Un segment est « parcouru » quand le bus a quitté l'arrêt du dessus
            const topTraveled = isInService && idx <= currentStopIndex;
            const bottomTraveled = isInService && idx < currentStopIndex;
            const traveledColor = 'rgba(255,255,255,0.14)';

            return (
              <li key={`${idx}-${s.stop}`} ref={isCurrent ? currentRef : undefined}>
                <button
                  type="button"
                  disabled={!isInService}
                  onClick={() => goToStop(idx)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`w-full grid grid-cols-[2.5rem_1fr_auto] items-stretch text-left pr-5 transition-colors ${
                    isCurrent ? 'bg-sse-raised' : isInService ? 'hover:bg-white/[0.04]' : ''
                  }`}
                >
                  {/* Rail : deux demi-segments + point d'arrêt */}
                  <span className="relative flex justify-center" aria-hidden="true">
                    {!isFirst && (
                      <span className="absolute top-0 h-1/2 w-1.5" style={{ backgroundColor: topTraveled ? traveledColor : lineColor }} />
                    )}
                    {!isLast && (
                      <span className="absolute bottom-0 h-1/2 w-1.5" style={{ backgroundColor: bottomTraveled ? traveledColor : lineColor }} />
                    )}
                    <span
                      className="relative self-center rounded-full"
                      style={
                        isCurrent
                          ? { width: 20, height: 20, background: '#fff', border: `5px solid ${lineColor}` }
                          : isPassed
                          ? { width: 10, height: 10, background: '#4b4670' }
                          : isTerminus
                          ? { width: 16, height: 16, background: '#fff', border: `4px solid ${lineColor}` }
                          : { width: 12, height: 12, background: '#fff', border: `3px solid ${lineColor}` }
                      }
                    />
                  </span>

                  <span className={`min-w-0 flex flex-col justify-center ${isCurrent ? 'py-3' : 'py-2.5'}`}>
                    {isCurrent && <span className="text-xs text-zinc-400">{isLast ? 'Terminus' : 'Prochain arrêt'}</span>}
                    <span
                      className={`uppercase truncate ${
                        isCurrent
                          ? 'font-sign text-xl font-bold text-white'
                          : isPassed
                          ? 'text-sm text-zinc-500'
                          : isTerminus
                          ? 'text-sm font-bold text-white'
                          : 'text-sm font-medium text-zinc-100'
                      }`}
                    >
                      {s.stop}
                    </span>
                  </span>

                  <span className="flex flex-col items-end justify-center pl-3">
                    <span className={`font-mono ${isCurrent ? 'text-lg font-semibold text-white' : isPassed ? 'text-sm text-zinc-600' : 'text-sm text-zinc-200'}`}>
                      {getAdjustedStopTime(s.time)}
                    </span>
                    {delayMinutes !== 0 && !isPassed && (
                      <span className="font-mono text-[11px] text-zinc-500">prévu {s.time}</span>
                    )}
                    {!isPassed && isInService && (
                      <span className={`text-xs ${isCurrent ? 'font-semibold text-sse-yellow' : 'text-zinc-400'}`}>
                        {relativeLabel(diff)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
