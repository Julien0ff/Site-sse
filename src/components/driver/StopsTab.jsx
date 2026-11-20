import React from 'react';
import { Bus } from '@getpapillon/papicons';

// Onglet « Arrêts » : thermomètre de ligne du service en cours
export default function StopsTab({ svc }) {
  const {
    currentStopIndex,
    selectedTrip,
    activeTripStops,
    isInService,
    getAdjustedStopTime,
  } = svc;

  return (
    <div className="bg-sse-panel border border-white/10 rounded-xl p-5 lg:p-6 flex flex-col h-[calc(100vh-270px)] min-h-[480px] max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
        <span className="text-sm font-semibold text-zinc-300 flex items-center space-x-1.5">
          <Bus size={14} className="shrink-0 text-zinc-400" />
          <span>Arrêts du Service ({activeTripStops.length})</span>
        </span>
        <span className="text-[11px] text-zinc-300 font-mono">
          {selectedTrip?.isLimitedService ? "Service partiel" : "Service complet"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pt-2">
        <div className="relative pl-7 py-2 space-y-3.5">
          {/* Ligne thermomètre continue solide (Transit / TCL) */}
          <div 
            className="absolute left-[7px] top-[26px] bottom-[26px] w-[5px] bg-sse-yellow rounded-full pointer-events-none" 
          />

          {activeTripStops.map((s, idx) => {
            const isPassed = isInService && idx < currentStopIndex;
            const isCurrent = isInService && idx === currentStopIndex;
            const isFirst = idx === 0;
            const isLast = idx === activeTripStops.length - 1;
            const isTerminus = isFirst || isLast;

            return (
              <div 
                key={idx}
                className="relative flex items-center justify-between min-h-[36px] group transition-all"
              >
                {/* Point de station centré exactement sur la ligne */}
                <div className="absolute -left-7 w-[19px] h-[19px] flex items-center justify-center z-10">
                  {isCurrent ? (
                    <div className="w-[20px] h-[20px] rounded-full border-[3.5px] border-sse-yellow bg-sse-night flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-sse-yellow" />
                    </div>
                  ) : isTerminus ? (
                    <div className={`w-[17px] h-[17px] rounded-full border-[3.5px] border-sse-yellow flex items-center justify-center ${
                      isLast ? 'bg-sse-yellow' : 'bg-sse-panel'
                    }`}>
                      {isFirst && <div className="w-1.5 h-1.5 rounded-full bg-sse-yellow" />}
                    </div>
                  ) : isPassed ? (
                    <div className="w-[9px] h-[9px] rounded-full bg-zinc-600 border border-sse-panel" />
                  ) : (
                    <div className="w-[11px] h-[11px] rounded-full border-[2.5px] border-sse-yellow bg-white" />
                  )}
                </div>

                {/* Libellé & Horaire */}
                <div className="flex-1 flex items-center justify-between pl-1 pr-1 truncate">
                  <div className="truncate pr-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs uppercase tracking-tight truncate block ${
                        isCurrent
                          ? 'font-bold text-sse-yellow text-sm'
                          : isTerminus
                          ? 'font-bold text-white'
                          : isPassed
                          ? 'font-medium text-zinc-500 line-through' : 'font-bold text-white'
                      }`}>
                        {s.stop}
                      </span>
                      {isFirst && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-zinc-300 font-bold shrink-0">
                          Départ
                        </span>
                      )}
                      {isLast && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sse-yellow/20 text-sse-yellow font-bold shrink-0">
                          Terminus
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`shrink-0 font-mono text-xs ${
                    isCurrent
                      ? 'font-bold text-sse-yellow'
                      : isPassed
                      ? 'text-zinc-600' : 'text-zinc-300'
                  }`}>
                    {getAdjustedStopTime(s.time)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
