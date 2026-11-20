import React from 'react';
import { ChevronLeft, Check, ArrowRight, Bus, User } from '@getpapillon/papicons';

// Onglet « Conduite » du pupitre : compte à rebours, prochain arrêt, régulation
export default function DriveTab({ svc, handleFinishService, activeRoster, handleLaunchServiceFromRoster, changeAppMode, setIsProfileOpen }) {
  const {
    setStep,
    selectedDirection,
    departureTime,
    currentStopIndex,
    setCurrentStopIndex,
    delayMinutes,
    setDelayMinutes,
    setIsForceDeparted,
    serviceCompleted,
    setServiceCompleted,
    lastAutoCheckedStep,
    selectedTrip,
    activeTripStops,
    departureAnalysis,
    isInService,
    currentStop,
    nextStopCountdown,
    getAdjustedStopTime,
    getMinutesFromNow,
    terminusNextStop,
    upcomingStops,
    activeLine,
  } = svc;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      {/* Colonne Principale Cockpit (7 colonnes sur PC) */}
      <div className="lg:col-span-7 space-y-4">
        
        {!isInService ? (
          /* AVANT DÉPART : COMPTE À REBOURS & APERÇU PREMIERS ARRÊTS */
          <div className="space-y-4">
            <div className="bg-sse-panel border border-sse-line rounded-xl p-6 lg:p-8 text-center">
              <span className="text-sm text-zinc-400">
                Départ dans
              </span>
              <div className="text-6xl sm:text-7xl lg:text-8xl font-sign font-bold my-3 text-white flex items-center justify-center select-none" role="timer" aria-live="off">
                {departureAnalysis.hours > 0 && (
                  <>
                    <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center">
                      <span key={`ht-${Math.floor(departureAnalysis.hours / 10)}`} className="animate-digit-roll inline-block">
                        {Math.floor(departureAnalysis.hours / 10)}
                      </span>
                    </span>
                    <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center">
                      <span key={`hu-${departureAnalysis.hours % 10}`} className="animate-digit-roll inline-block">
                        {departureAnalysis.hours % 10}
                      </span>
                    </span>
                    <span className="opacity-40 px-0.5">:</span>
                  </>
                )}

                {/* Minutes (00 à 59) */}
                <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center">
                  <span key={`mt-${Math.floor(departureAnalysis.minutes / 10)}`} className="animate-digit-roll inline-block">
                    {Math.floor(departureAnalysis.minutes / 10)}
                  </span>
                </span>
                <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center">
                  <span key={`mu-${departureAnalysis.minutes % 10}`} className="animate-digit-roll inline-block">
                    {departureAnalysis.minutes % 10}
                  </span>
                </span>

                <span className="opacity-40 px-0.5">:</span>

                {/* Secondes (00 à 59) */}
                <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center text-sse-yellow">
                  <span key={`st-${Math.floor(departureAnalysis.seconds / 10)}`} className="animate-digit-roll inline-block">
                    {Math.floor(departureAnalysis.seconds / 10)}
                  </span>
                </span>
                <span className="inline-block relative overflow-hidden h-[1.05em] w-[0.52em] text-center text-sse-yellow">
                  <span key={`su-${departureAnalysis.seconds % 10}`} className="animate-digit-roll inline-block">
                    {departureAnalysis.seconds % 10}
                  </span>
                </span>
              </div>
              <div className="text-sm text-zinc-400">
                Départ prévu à <span className="font-mono font-semibold text-white">{departureTime}</span>
              </div>

              {selectedTrip?.isLimitedService && (
                <div className="mt-3 text-xs text-amber-300 bg-amber-400/10 p-2.5 rounded-md border border-amber-400/20">
                  {selectedTrip.serviceNote}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-white/5 text-left flex items-center justify-between text-xs">
                <div>
                  <span className="text-xs text-zinc-400 block">Départ de</span>
                  <span className="font-bold text-white text-sm">{selectedTrip?.effectiveOriginStop || selectedTrip?.originStop}</span>
                </div>
                <button
                  onClick={() => {
                    setIsForceDeparted(true);
                    setCurrentStopIndex(0);
                    setDelayMinutes(0);
                  }}
                  className="bg-sse-yellow hover:bg-sse-yellow-hi active:scale-95 text-sse-night font-bold text-sm px-4 py-2.5 rounded-md transition-colors"
                >
                  Partir maintenant
                </button>
              </div>
            </div>

            {/* PROCHAIN ARRÊT PRÉVU AU DÉPART DU TERMINUS */}
            <div className="bg-sse-panel border border-white/10 rounded-xl p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <span className="text-sm text-zinc-400">Premier arrêt</span>
                <span className="text-xs font-mono font-bold text-white">
                  {getAdjustedStopTime(terminusNextStop?.time)}
                </span>
              </div>

              <div className="pt-2.5 pb-1">
                <h4 className="font-sign text-2xl lg:text-3xl font-bold text-white uppercase">
                  {terminusNextStop?.stop || "Départ en ligne"}
                </h4>
                <p className="text-sm text-zinc-400 mt-0.5">
                  Arrivée estimée {getMinutesFromNow(terminusNextStop?.time)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* EN SERVICE : PROCHAIN ARRÊT ACTIF */
          <div className="bg-sse-panel border border-white/10 rounded-xl p-5 lg:p-6 space-y-4">
            <div className="space-y-2 border-b border-white/5 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-sse-yellow">En service</span>
                <span className="text-sm font-mono text-zinc-300">
                  Arrêt {currentStopIndex + 1} sur {activeTripStops.length}
                </span>
              </div>
              <div className="w-full h-1 bg-sse-raised rounded-full overflow-hidden">
                <div
                  className="h-full bg-sse-yellow rounded-full transition-all duration-300"
                  style={{ width: `${activeTripStops.length > 0 ? Math.round(((currentStopIndex + 1) / activeTripStops.length) * 100) : 0}%` }}
                />
              </div>
            </div>

            <div
              key={`prochain-arret-${currentStopIndex}-${currentStop?.stop || ''}`}
              className="text-center py-3 animate-stop-change"
            >
              <span className="text-sm text-zinc-400">
                {currentStop?.isLast ? 'Terminus' : 'Prochain arrêt'}
              </span>
              <h3 className="font-sign text-4xl lg:text-5xl font-bold text-white mt-1 leading-none uppercase">
                {currentStop?.stop || "Terminus"}
              </h3>

              <div className="mt-4 inline-flex items-baseline gap-2">
                <span className="text-sm text-zinc-400">Arrivée prévue</span>
                <span className="font-mono font-semibold text-lg text-white">
                  {currentStop?.time ? getAdjustedStopTime(currentStop.time) : "--:--"}
                </span>
                {nextStopCountdown && (
                  <span className={`text-sm font-semibold ${
                    nextStopCountdown.status === 'arret'
                      ? 'text-amber-300' : nextStopCountdown.status === 'retard' ? 'text-red-300' : 'text-sse-yellow'
                  }`}>
                    {nextStopCountdown.text}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center space-x-3">
              <button
                onClick={() => setCurrentStopIndex(prev => Math.max(0, prev - 1))}
                disabled={currentStopIndex === 0}
                className="bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white p-4 rounded-lg border border-white/10 active:scale-95 transition-all"
                title="Arrêt précédent (Flèche gauche)"
              >
                <ChevronLeft size={22} className="shrink-0" />
              </button>

              {currentStop?.isLast ? (
                serviceCompleted ? (
                  <div className="flex-1 py-4 px-5 rounded-lg bg-sse-yellow/20 text-sse-yellow border border-sse-yellow/40 font-bold text-sm text-center flex items-center justify-center space-x-2">
                    <Check size={20} className="shrink-0" />
                    <span>Service terminé</span>
                  </div>
                ) : (
                  <button
                    onClick={handleFinishService}
                    className="flex-1 py-4 px-5 rounded-lg font-bold text-sm bg-sse-yellow hover:bg-sse-yellow-hi text-sse-night flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
                  >
                    <Check size={20} className="shrink-0" />
                    <span>Terminer le service</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => setCurrentStopIndex(prev => Math.min(activeTripStops.length - 1, prev + 1))}
                  className="flex-1 py-4 px-5 rounded-lg font-bold text-sm bg-sse-yellow hover:bg-sse-yellow-hi text-sse-night flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
                  title="Arrêt suivant (Flèche droite)"
                >
                  <Check size={20} className="shrink-0" />
                  <span>Arrêt desservi</span>
                </button>
              )}
            </div>

            {/* Félicitations et actions après clôture de service */}
            {serviceCompleted && (
              <div className="bg-sse-yellow/10 border border-sse-yellow/30 rounded-lg p-4 text-center space-y-2.5 mt-3 animate-autocheck-pop">
                <div className="flex items-center justify-center space-x-1.5 text-sm font-semibold text-zinc-300">
                  <span>Service enregistré dans votre historique.</span>
                </div>
                {lastAutoCheckedStep && (
                  <div className="inline-flex items-center space-x-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold px-3 py-1 rounded-full animate-check-bounce">
                    <Check size={14} />
                    <span>Course #{lastAutoCheckedStep} cochée sur votre feuille de route</span>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {(() => {
                    const nextRosterStep = activeRoster?.steps?.find(s => !s.isCompleted);
                    if (nextRosterStep) {
                      return (
                        <button
                          onClick={() =>
                            handleLaunchServiceFromRoster({
                              lineName: nextRosterStep.lineName,
                              dirId: nextRosterStep.dirId,
                              departureTime: nextRosterStep.departureTime,
                              rosterStepNumber: nextRosterStep.stepNumber
                            })
                          }
                          className="px-3.5 py-2 rounded-md bg-sse-yellow text-sse-night hover:bg-sse-yellow-hi text-xs font-bold transition-all flex items-center space-x-1.5"
                        >
                          <span>Course #{nextRosterStep.stepNumber} ({nextRosterStep.lineName} • {nextRosterStep.departureTime})</span>
                          <ArrowRight size={13} />
                        </button>
                      );
                    }
                    return null;
                  })()}
                  {activeRoster && (
                    <button
                      onClick={() => changeAppMode('roulement')}
                      className="px-3.5 py-2 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex items-center space-x-1.5 border border-white/10"
                    >
                      <span>Voir l'itinéraire</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setStep('select-line');
                      setServiceCompleted(false);
                      setCurrentStopIndex(0);
                    }}
                    className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                  >
                    Autre service
                  </button>
                  <button
                    onClick={() => setIsProfileOpen(true)}
                    className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all flex items-center space-x-1"
                  >
                    <User size={13} />
                    <span>Profil</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RÉGULATION CONDUCTEUR */}
        <div className="bg-sse-panel border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-sm text-zinc-400">Régulation</span>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${
                delayMinutes === 0
                  ? 'bg-sse-yellow/15 text-sse-yellow border border-sse-yellow/30'
                  : delayMinutes > 0
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' : 'bg-white/10 text-white border border-white/20'
              }`}>
                {delayMinutes === 0 ? "À l'heure" : delayMinutes > 0 ? `${delayMinutes} min de retard` : `${-delayMinutes} min d'avance`}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 font-mono">
            <button
              onClick={() => setDelayMinutes(d => d - 1)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-3 py-1.5 rounded-md text-xs active:scale-95"
              title="-1 min (Avance)"
            >
              -1m
            </button>
            <button
              onClick={() => setDelayMinutes(0)}
              className="bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10 font-bold px-3 py-1.5 rounded-md text-xs active:scale-95"
              title="Remise à zéro"
            >
              0
            </button>
            <button
              onClick={() => setDelayMinutes(d => d + 1)}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-3 py-1.5 rounded-md text-xs active:scale-95"
              title="+1 min (Retard)"
            >
              +1m
            </button>
          </div>
        </div>

      </div>

      {/* Colonne Latérale (5 colonnes sur PC : Arrêts Suivants + Synthèse) */}
      <div className="lg:col-span-5 space-y-4">
        
        {/* LES 2 ARRÊTS SUIVANTS (STYLE TRANSIT / TCL) */}
        {upcomingStops.length > 0 && (
          <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-sm font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Bus size={14} className="shrink-0 text-zinc-400" />
                <span>Arrêts suivants</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Ligne {activeLine.name}
              </span>
            </div>

            <div className="relative pl-7 py-1 space-y-3.5">
              {/* Ligne verticale continue (Transit / TCL) */}
              <div className="absolute left-[7px] top-3 bottom-2.5 w-[5px] bg-sse-yellow rounded-full" />

              {upcomingStops.map((stop, i) => {
                const isFirst = i === 0;

                return (
                  <div 
                    key={`upcoming-${currentStopIndex}-${isInService ? 'srv' : 'wait'}-${i}-${stop.stop}`} 
                    style={{ animationDelay: `${i * 65}ms` }}
                    className={`relative flex items-center justify-between group animate-upcoming-stop ${isFirst ? 'min-h-[32px]' : 'min-h-[26px]'}`}
                  >
                    {/* Point de station aligné sur la ligne */}
                    <div className="absolute -left-7 flex items-center justify-center w-[19px] h-[19px] z-10">
                      {isFirst ? (
                        <div className="w-[15px] h-[15px] rounded-full border-[3.5px] border-sse-yellow bg-sse-night" />
                      ) : (
                        <div className="w-[10px] h-[10px] rounded-full border-[2px] border-sse-yellow bg-white" />
                      )}
                    </div>

                    <div className="truncate pr-2 pl-1">
                      <div className={`uppercase tracking-tight truncate group-hover:text-sse-yellow transition-colors ${
                        isFirst 
                          ? 'text-[15px] font-bold text-white' : 'text-xs font-bold text-zinc-300'
                      }`}>
                        {stop.stop}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`font-mono font-bold ${
                        isFirst ? 'text-sm text-white' : 'text-xs text-zinc-300'
                      }`}>
                        {getAdjustedStopTime(stop.time)}
                      </div>
                      <div className={`font-mono ${
                        isFirst ? 'text-xs font-bold text-sse-yellow' : 'text-[10px] text-sse-yellow/80'
                      }`}>
                        {getMinutesFromNow(stop.time)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Synthèse du Service visible sur grand écran */}
        <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-3 hidden lg:block">
          <span className="text-sm font-semibold text-zinc-300 block border-b border-white/5 pb-2">
            Récapitulatif
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">Origine</span>
              <span className="font-bold text-white text-right">{selectedTrip?.effectiveOriginStop || selectedTrip?.originStop}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">Terminus</span>
              <span className="font-bold text-sse-yellow text-right">{selectedTrip?.destinationStop || selectedDirection.destination}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-zinc-400">Arrêts au service</span>
              <span className="font-mono font-bold text-white">{activeTripStops.length} arrêts</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-400">Arrivée prévue</span>
              <span className="font-mono font-bold text-white">{selectedTrip?.arrivalTime}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
