import React, { useState, useEffect } from 'react';
import { List, Sparkles, Check, Bus, ArrowRight, Clock, MapPin } from '@getpapillon/papicons';
import { generateRandomRoulement } from '../utils/roulementGenerator.js';
import { setStoredActiveRoster } from '../utils/storageUtils.js';

export default function RoulementView({ busData, activeRoster, setActiveRoster, onLaunchService, timeString }) {
  const [depotFilter, setDepotFilter] = useState('all');           // 'all' | 'berthee' | 'courcelles'
  const [durationType, setDurationType] = useState('moyenne');     // 'courte' | 'moyenne' | 'longue'
  const [serviceMode, setServiceMode] = useState('interligne');    // 'interligne' | 'mono'
  const [startLineFilter, setStartLineFilter] = useState('all');   // 'all' | nom de ligne
  const [endMode, setEndMode] = useState('depot');                 // 'depot' | 'terminus'
  const [includePause, setIncludePause] = useState(true);          // true | false
  const [viewFilter, setViewFilter] = useState('all');             // 'all' | 'todo' | 'done'

  // Mise à niveau automatique si une ancienne feuille v1 (sans itinéraire/dépôt) était en cache
  useEffect(() => {
    if (activeRoster && (!activeRoster.version || activeRoster.version < 2 || !activeRoster.hlpStart)) {
      const upgraded = generateRandomRoulement(busData, {
        durationType: activeRoster.durationType || 'moyenne',
        startLineName: activeRoster.steps?.[0]?.lineName || null,
        depotFilter,
        serviceMode,
        endMode,
        includePause,
        startTime: timeString?.slice(0, 5) || '14:00'
      });
      if (upgraded) {
        setActiveRoster(upgraded);
        setStoredActiveRoster(upgraded);
      }
    }
  }, [activeRoster, busData]);

  const handleGenerate = () => {
    const r = generateRandomRoulement(busData, {
      durationType,
      startLineName: startLineFilter === 'all' ? null : startLineFilter,
      depotFilter,
      serviceMode,
      endMode,
      includePause,
      startTime: timeString?.slice(0, 5) || '14:00'
    });
    if (r) {
      setActiveRoster(r);
      setStoredActiveRoster(r);
      setViewFilter('all');
    }
  };

  const handleToggleStep = (stepNumber) => {
    if (!activeRoster) return;
    const now = Date.now();
    const updatedSteps = activeRoster.steps.map(s => {
      if (s.stepNumber === stepNumber) {
        const nextDone = !s.isCompleted;
        return {
          ...s,
          isCompleted: nextDone,
          justCompletedAt: nextDone ? now : null
        };
      }
      return s;
    });
    const completedCount = updatedSteps.filter(s => s.isCompleted).length;
    const updated = {
      ...activeRoster,
      steps: updatedSteps,
      completedSteps: completedCount
    };
    setActiveRoster(updated);
    setStoredActiveRoster(updated);
  };

  const handleClearRoster = () => {
    setActiveRoster(null);
    setStoredActiveRoster(null);
  };

  const allCompleted = activeRoster && activeRoster.totalSteps > 0 && activeRoster.completedSteps === activeRoster.totalSteps;
  const activeStepNumber = activeRoster?.steps?.find(s => !s.isCompleted)?.stepNumber ?? null;

  const filteredSteps = (activeRoster?.steps || []).filter(s => {
    if (viewFilter === 'todo') return !s.isCompleted;
    if (viewFilter === 'done') return s.isCompleted;
    return true;
  });

  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Feuille de route & Itinéraire
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Sortie de dépôt, changements de girouette, pauses aux terminus et retour centre bus.
          </p>
        </div>

        {activeRoster && (
          <button
            type="button"
            onClick={handleClearRoster}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-400 hover:text-white border border-white/10 self-start sm:self-auto transition-all"
          >
            Réinitialiser la feuille
          </button>
        )}
      </div>

      {/* PANNEAU DE FILTRES & GÉNÉRATEUR */}
      <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Dépôt */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
              Centre Bus (Dépôt)
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold">
              {[
                { id: 'all', label: 'Auto' },
                { id: 'berthee', label: 'Berthée' },
                { id: 'courcelles', label: 'Courcelles' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDepotFilter(opt.id)}
                  className={`py-2 rounded-xl text-center transition-all truncate px-1 ${
                    depotFilter === opt.id
                      ? 'bg-[#DAE44E] text-[#080226] font-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Durée */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
              Durée (Tours)
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold">
              {[
                { id: 'courte', label: '1 AR' },
                { id: 'moyenne', label: '2 AR' },
                { id: 'longue', label: '3 AR' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDurationType(opt.id)}
                  className={`py-2 rounded-xl text-center transition-all ${
                    durationType === opt.id
                      ? 'bg-[#DAE44E] text-[#080226] font-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Type de roulement */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
              Enchaînement
            </label>
            <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold">
              {[
                { id: 'interligne', label: 'Inter-lignes' },
                { id: 'mono', label: 'Ligne unique' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setServiceMode(opt.id)}
                  className={`py-2 rounded-xl text-center transition-all ${
                    serviceMode === opt.id
                      ? 'bg-[#DAE44E] text-[#080226] font-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Fin de service */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
              Fin de service
            </label>
            <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold">
              {[
                { id: 'depot', label: 'Retour Dépôt' },
                { id: 'terminus', label: 'Au Terminus' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setEndMode(opt.id)}
                  className={`py-2 rounded-xl text-center transition-all ${
                    endMode === opt.id
                      ? 'bg-[#DAE44E] text-[#080226] font-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Barre inférieure : Ligne de départ + Pause + Bouton Générer */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 pt-1 items-center">
          <div className="sm:col-span-4">
            <select
              value={startLineFilter}
              onChange={(e) => setStartLineFilter(e.target.value)}
              className="w-full bg-[#180E4F] border border-white/10 text-white text-xs font-semibold rounded-2xl px-3.5 py-3 focus:outline-none focus:border-[#DAE44E] transition-all"
            >
              <option value="all">Ligne de départ : Aléatoire</option>
              {(busData.lines || []).map(l => (
                <option key={l.name} value={l.name}>
                  Départ sur la Ligne {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <button
              type="button"
              onClick={() => setIncludePause(p => !p)}
              className={`w-full py-3 px-4 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between transition-all ${
                includePause
                  ? 'bg-[#DAE44E]/15 border-[#DAE44E]/40 text-[#DAE44E]'
                  : 'bg-white/5 border-white/10 text-zinc-400'
              }`}
            >
              <span>Pause coupure au terminus</span>
              <span className="font-black uppercase">{includePause ? 'Oui' : 'Non'}</span>
            </button>
          </div>

          <div className="sm:col-span-4">
            <button
              type="button"
              onClick={handleGenerate}
              className="w-full bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-[0.98] text-[#080226] font-black text-xs sm:text-sm uppercase py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl"
            >
              <Sparkles size={16} />
              <span>Générer l'itinéraire</span>
            </button>
          </div>
        </div>
      </div>

      {/* ITINÉRAIRE DE LA FEUILLE DE ROUTE */}
      {activeRoster ? (
        <div className="space-y-5">
          {/* Bandeau synthèse de l'itinéraire */}
          <div className="bg-[#100A38] border border-[#DAE44E]/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#080226] bg-[#DAE44E] px-2.5 py-0.5 rounded-full">
                  {activeRoster.id}
                </span>
                <span className="text-xs font-mono text-zinc-300 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                  {activeRoster.startTime} ➔ {activeRoster.endTime} (~{activeRoster.estimatedDuration})
                </span>
                <span className="text-xs font-mono text-[#DAE44E] bg-[#DAE44E]/10 px-2.5 py-0.5 rounded-full border border-[#DAE44E]/25">
                  {activeRoster.depotStart}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {activeRoster.summary}
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
              {/* Filtre d'affichage des étapes */}
              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-[11px] font-mono font-bold">
                {[
                  { id: 'all', label: `Tout (${activeRoster.totalSteps})` },
                  { id: 'todo', label: `À faire (${activeRoster.totalSteps - activeRoster.completedSteps})` },
                  { id: 'done', label: `Faits (${activeRoster.completedSteps})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setViewFilter(f.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      viewFilter === f.id
                        ? 'bg-[#DAE44E] text-[#080226] font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Progression */}
              <div className="sm:text-right space-y-1">
                <div className="text-xs font-mono font-bold text-white">
                  {activeRoster.completedSteps} / {activeRoster.totalSteps} services validés
                </div>
                <div className="w-40 bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#DAE44E] h-full transition-all duration-500 rounded-full"
                    style={{ width: `${(activeRoster.completedSteps / activeRoster.totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TIMELINE VERTICALE DE L'ITINÉRAIRE */}
          <div className="relative pl-6 sm:pl-9 space-y-4">
            {/* Ligne verticale continue de l'itinéraire */}
            <div className="absolute left-[11px] sm:left-[17px] top-6 bottom-6 w-[4px] bg-white/10 rounded-full overflow-hidden">
              <div
                className="w-full bg-[#DAE44E] transition-all duration-700"
                style={{
                  height: `${
                    allCompleted
                      ? 100
                      : Math.min(95, Math.max(8, (activeRoster.completedSteps / Math.max(1, activeRoster.totalSteps)) * 100))
                  }%`
                }}
              />
            </div>

            {/* 1. NŒUD DE DÉPART : SORTIE DE DÉPÔT (HAUT-LE-PIED GIR 61) */}
            {viewFilter !== 'done' && activeRoster.hlpStart && (
              <div className="relative">
                {/* Point Dépôt sur la ligne */}
                <div className="absolute -left-6 sm:-left-9 top-4 w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full bg-[#DAE44E] text-[#080226] flex items-center justify-center font-mono font-black text-xs shadow-[0_0_15px_rgba(218,228,78,0.4)] z-10">
                  <Bus size={14} />
                </div>

                <div className="bg-[#140B47] border border-[#DAE44E]/40 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono font-black uppercase bg-[#DAE44E] text-[#080226] px-2.5 py-0.5 rounded-full">
                        Sortie de Dépôt • Haut-le-Pied
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-white/10 text-[#DAE44E] px-2 py-0.5 rounded-lg border border-[#DAE44E]/30">
                        Girouette : GIR {activeRoster.hlpStart.girCode} ({activeRoster.hlpStart.girLabel})
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-black text-white pt-0.5">
                      {activeRoster.hlpStart.depotName} ➔ <span className="text-[#DAE44E]">{activeRoster.hlpStart.targetStop}</span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Mise en place au terminus de départ ({activeRoster.hlpStart.durationMinutes} min de liaison HLP)
                    </p>
                  </div>

                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-black text-[#DAE44E]">
                      {activeRoster.hlpStart.departureTime} ➔ {activeRoster.hlpStart.arrivalTime}
                    </div>
                    <div className="text-[10px] text-zinc-400 uppercase">
                      Prise de bus au centre
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ÉTAPES COMMERCIALES + CHANGEMENTS DE GIROUETTE + PAUSES */}
            {filteredSteps.map((step) => {
              const isDone = step.isCompleted;
              const isCurrent = step.stepNumber === activeStepNumber;
              const isRecentlyAutoChecked = isDone && step.justCompletedAt && (Date.now() - step.justCompletedAt < 60000);

              return (
                <div key={step.stepNumber} className="space-y-3">
                  {/* PAUSE OU BATTEMENT PRÉCÉDANT L'ÉTAPE */}
                  {step.pauseBefore && (
                    <div className="relative">
                      <div className="absolute -left-6 sm:-left-9 top-3 w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full bg-[#100A38] border-2 border-amber-400 text-amber-300 flex items-center justify-center z-10">
                        <Clock size={13} />
                      </div>

                      <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-black uppercase bg-amber-400 text-[#080226] px-2 py-0.5 rounded-full">
                            {step.pauseBefore.type === 'pause' ? 'Pause Coupure' : 'Battement Terminus'}
                          </span>
                          <span className="text-xs font-bold text-amber-200">
                            {step.pauseBefore.label} à <strong>{step.pauseBefore.location}</strong>
                          </span>
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-300 shrink-0">
                          {step.pauseBefore.startTime} ➔ {step.pauseBefore.endTime} ({step.pauseBefore.durationMinutes} min)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INDICATEUR DE CHANGEMENT DE GIROUETTE / CHANGEMENT DE LIGNE */}
                  <div className="relative flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#DAE44E] absolute -left-[19px] sm:-left-[29px] z-10" />
                    <div className={`inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-mono border ${
                      step.isLineChange
                        ? 'bg-[#DAE44E]/15 border-[#DAE44E]/50 text-[#DAE44E]'
                        : 'bg-white/[0.04] border-white/10 text-zinc-300'
                    }`}>
                      {step.isLineChange && (
                        <span className="font-black uppercase bg-[#DAE44E] text-[#080226] px-2 py-0.2 rounded-md text-[10px]">
                          Changement de ligne au terminus {step.transferTerminus}
                        </span>
                      )}
                      <span>
                        Changement girouette : <strong className="text-white">GIR {step.previousGirCode}</strong> ➔ <strong className="text-[#DAE44E]">GIR {step.code}</strong>
                      </span>
                    </div>
                  </div>

                  {/* CARTE DE LA COURSE COMMERCIALE */}
                  <div className="relative">
                    {/* Nœud numéroté / coché sur la ligne d'itinéraire */}
                    <button
                      type="button"
                      onClick={() => handleToggleStep(step.stepNumber)}
                      className={`absolute -left-6 sm:-left-9 top-5 w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full flex items-center justify-center font-mono font-black text-xs transition-all z-10 ${
                        isDone
                          ? 'bg-emerald-400 text-[#080226] shadow-[0_0_16px_rgba(52,211,153,0.6)] animate-check-bounce'
                          : isCurrent
                          ? 'bg-[#DAE44E] text-[#080226] ring-4 ring-[#DAE44E]/25'
                          : 'bg-[#180E4F] text-zinc-300 border-2 border-white/20 hover:border-[#DAE44E]'
                      }`}
                      title={isDone ? 'Marquer comme à faire' : 'Cocher ce service'}
                    >
                      {isDone ? <Check size={15} /> : step.stepNumber}
                    </button>

                    <div
                      className={`p-4 sm:p-5 rounded-3xl border transition-all ${
                        isRecentlyAutoChecked
                          ? 'bg-emerald-950/35 border-emerald-400 animate-autocheck-pop'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/35 opacity-85'
                          : isCurrent
                          ? 'bg-[#130B42] border-[#DAE44E] shadow-[0_0_25px_rgba(218,228,78,0.12)]'
                          : 'bg-[#100A38] border-white/10 hover:border-[#DAE44E]/40 shadow-xl'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Gauche : Logo + Itinéraire Départ -> Via -> Terminus */}
                        <div className="flex items-start space-x-3.5 min-w-0">
                          <img
                            src={step.logoUrl}
                            alt={step.lineName}
                            className="h-9 w-18 object-contain rounded-lg bg-black/40 p-1 border border-white/10 shrink-0 mt-0.5"
                          />

                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono font-black uppercase text-[#DAE44E]">
                                {step.label}
                              </span>
                              <span className="text-[10px] font-mono font-black bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30 px-2 py-0.5 rounded-md">
                                GIR {step.code}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                {step.stopsCount} arrêts • {step.durationMinutes} min
                              </span>
                              {isDone && (
                                <span className="text-[10px] font-mono font-black uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                                  ✓ Service validé
                                </span>
                              )}
                            </div>

                            {/* Tracé de l'étape : Départ -> Arrivée */}
                            <div className="flex flex-wrap items-center gap-1.5 text-sm sm:text-base font-black text-white">
                              <span>{step.origin}</span>
                              <span className="text-[#DAE44E] px-1">➔</span>
                              <span className="text-[#DAE44E]">{step.destination}</span>
                            </div>

                            {/* Arrêts intermédiaires (Via) */}
                            {step.viaStops && step.viaStops.length > 0 && (
                              <div className="text-[11px] text-zinc-400 flex items-center space-x-1.5 truncate">
                                <MapPin size={12} color="#DAE44E" className="shrink-0" />
                                <span className="truncate">
                                  Via : {step.viaStops.join(' • ')} (Terminus : {step.destination})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Droite : Horaires + Actions */}
                        <div className="flex items-center justify-between lg:justify-end space-x-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                          <div className="text-left lg:text-right pr-2 font-mono">
                            <div className="text-sm sm:text-base font-black text-white">
                              {step.departureTime} ➔ {step.arrivalTime}
                            </div>
                            <div className="text-[10px] text-zinc-400">
                              Départ terminus ➔ Arrivée
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onLaunchService({
                              lineName: step.lineName,
                              dirId: step.dirId,
                              departureTime: step.departureTime,
                              rosterStepNumber: step.stepNumber
                            })}
                            className="bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-95 text-[#080226] px-3.5 py-2.5 rounded-xl font-black text-xs uppercase flex items-center space-x-1.5 shadow-md transition-all"
                          >
                            <span>Pupitre</span>
                            <ArrowRight size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStep(step.stepNumber)}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                              isDone
                                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:border-[#DAE44E]'
                            }`}
                            title={isDone ? 'Décocher' : 'Cocher manuellement'}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 3. NŒUD FINAL : RETOUR CENTRE BUS (GIR 65) OU FIN DE SERVICE AU TERMINUS (GIR 61) */}
            {viewFilter !== 'done' && activeRoster.hlpEnd && (
              <div className="space-y-3 pt-1">
                {/* Bandeau changement de girouette de fin */}
                <div className="relative flex items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#DAE44E] absolute -left-[19px] sm:-left-[29px] z-10" />
                  <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-mono bg-white/[0.04] border border-white/10 text-zinc-300">
                    <span>
                      Changement girouette : <strong className="text-white">GIR {activeRoster.hlpEnd.previousGirCode}</strong> ➔ <strong className="text-[#DAE44E]">GIR {activeRoster.hlpEnd.girCode} ({activeRoster.hlpEnd.girLabel})</strong>
                    </span>
                  </div>
                </div>

                {/* Carte Retour Centre Bus / Fin de service */}
                <div className="relative">
                  <div className={`absolute -left-6 sm:-left-9 top-4 w-[26px] h-[26px] sm:w-[30px] sm:h-[30px] rounded-full flex items-center justify-center font-mono font-black text-xs z-10 ${
                    allCompleted
                      ? 'bg-emerald-400 text-[#080226] shadow-[0_0_16px_rgba(52,211,153,0.6)] animate-check-bounce'
                      : 'bg-[#DAE44E] text-[#080226]'
                  }`}>
                    <Check size={15} />
                  </div>

                  <div className={`rounded-3xl p-4 sm:p-5 border shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                    allCompleted
                      ? 'bg-emerald-950/30 border-emerald-400/50'
                      : 'bg-[#140B47] border-[#DAE44E]/40'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-black uppercase bg-[#DAE44E] text-[#080226] px-2.5 py-0.5 rounded-full">
                          {activeRoster.hlpEnd.type === 'retour_depot' ? 'Retour Centre Bus • HLP' : 'Fin de Service'}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-white/10 text-[#DAE44E] px-2 py-0.5 rounded-lg border border-[#DAE44E]/30">
                          GIR {activeRoster.hlpEnd.girCode} • {activeRoster.hlpEnd.girLabel}
                        </span>
                      </div>

                      <div className="text-sm sm:text-base font-black text-white pt-0.5">
                        {activeRoster.hlpEnd.type === 'retour_depot' ? (
                          <>
                            {activeRoster.hlpEnd.fromStop} ➔ <span className="text-[#DAE44E]">{activeRoster.hlpEnd.depotName}</span>
                          </>
                        ) : (
                          <>
                            Arrêt du véhicule au terminus <span className="text-[#DAE44E]">{activeRoster.hlpEnd.fromStop}</span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">
                        {activeRoster.hlpEnd.type === 'retour_depot'
                          ? `Rentrée au dépôt après le dernier voyage (${activeRoster.hlpEnd.durationMinutes} min HLP)`
                          : 'Fin de vacation conducteur sur place au terminus'}
                      </p>
                    </div>

                    <div className="text-left sm:text-right font-mono shrink-0">
                      <div className="text-sm font-black text-[#DAE44E]">
                        {activeRoster.hlpEnd.type === 'retour_depot'
                          ? `${activeRoster.hlpEnd.departureTime} ➔ ${activeRoster.hlpEnd.arrivalTime}`
                          : activeRoster.hlpEnd.arrivalTime}
                      </div>
                      <div className="text-[10px] text-zinc-400 uppercase">
                        {allCompleted ? 'Vacation terminée ✓' : 'Fin de feuille de route'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#100A38] border border-white/5 rounded-3xl p-10 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#DAE44E]/10 border border-[#DAE44E]/20 text-[#DAE44E] flex items-center justify-center mx-auto">
            <List size={24} />
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Configurez vos filtres ci-dessus et cliquez sur « Générer l'itinéraire ».
          </p>
        </div>
      )}
    </div>
  );
}
