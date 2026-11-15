import React, { useState, useEffect, useMemo } from 'react';
import { List, Sparkles, Check, Bus, ArrowRight, Clock, MapPin, Home } from '@getpapillon/papicons';
import { generateRandomRoulement } from '../utils/roulementGenerator.js';
import { setStoredActiveRoster } from '../utils/storageUtils.js';

function Segmented({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">{label}</label>
      <div
        className="grid gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`py-2 rounded-xl text-center transition-all truncate px-1.5 ${
              value === opt.id ? 'bg-[#DAE44E] text-[#080226] font-black shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Colonne "rail" façon itinéraire : point + segment de ligne vers l'élément suivant
function Rail({ dot, isLast, filled }) {
  return (
    <div className="flex flex-col items-center w-9 shrink-0">
      <div className="h-9 flex items-center justify-center">{dot}</div>
      {!isLast && (
        <div className={`w-[3px] flex-1 rounded-full transition-colors duration-500 ${filled ? 'bg-[#DAE44E]' : 'bg-white/10'}`} />
      )}
    </div>
  );
}

export default function RoulementView({ busData, activeRoster, setActiveRoster, onLaunchService, timeString }) {
  const [depotFilter, setDepotFilter] = useState('all');
  const [durationType, setDurationType] = useState('moyenne');
  const [serviceMode, setServiceMode] = useState('interligne');
  const [startLineFilter, setStartLineFilter] = useState('all');
  const [endMode, setEndMode] = useState('depot');
  const [includePause, setIncludePause] = useState(true);
  const [viewFilter, setViewFilter] = useState('all');
  const [showMobileFilters, setShowMobileFilters] = useState(!activeRoster);
  const [error, setError] = useState('');

  // Les anciennes feuilles (format incompatible) sont supprimées
  useEffect(() => {
    if (activeRoster && (activeRoster.version || 0) < 3) {
      setActiveRoster(null);
      setStoredActiveRoster(null);
      setShowMobileFilters(true);
    }
  }, [activeRoster]);

  const save = (r) => {
    setActiveRoster(r);
    setStoredActiveRoster(r);
  };

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
    if (!r) {
      setError('Aucun départ trouvé avec ces filtres.');
      return;
    }
    setError('');
    save(r);
    setViewFilter('all');
    setShowMobileFilters(false);
  };

  const handleToggleStep = (stepNumber) => {
    if (!activeRoster) return;
    const steps = activeRoster.steps.map(s =>
      s.stepNumber === stepNumber
        ? { ...s, isCompleted: !s.isCompleted, justCompletedAt: !s.isCompleted ? Date.now() : null }
        : s
    );
    save({ ...activeRoster, steps, completedSteps: steps.filter(s => s.isCompleted).length });
  };

  const roster = activeRoster && (activeRoster.version || 0) >= 3 ? activeRoster : null;
  const allDone = roster && roster.completedSteps === roster.totalSteps;
  const nextStep = roster?.steps.find(s => !s.isCompleted) || null;

  // Construction de la liste d'éléments de l'itinéraire
  const items = useMemo(() => {
    if (!roster) return [];
    const list = [];
    if (viewFilter !== 'done') list.push({ kind: 'start', key: 'start' });
    roster.steps.forEach(step => {
      if (viewFilter === 'todo' && step.isCompleted) return;
      if (viewFilter === 'done' && !step.isCompleted) return;
      if (step.pauseBefore && viewFilter === 'all') list.push({ kind: 'pause', key: `p${step.stepNumber}`, step });
      list.push({ kind: 'step', key: `s${step.stepNumber}`, step });
    });
    if (viewFilter !== 'done') list.push({ kind: 'end', key: 'end' });
    return list;
  }, [roster, viewFilter]);

  const isFilled = (item) => {
    if (!roster) return false;
    if (item.kind === 'start') return roster.completedSteps > 0;
    if (item.kind === 'pause') return item.step.isCompleted;
    if (item.kind === 'step') return item.step.isCompleted;
    return false;
  };

  const progress = roster ? Math.round((roster.completedSteps / roster.totalSteps) * 100) : 0;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#DAE44E] bg-[#DAE44E]/10 px-2.5 py-0.5 rounded-full border border-[#DAE44E]/20">
            Exploitation • Seine-Sud-Est
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
            Feuille de route
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Sortie de dépôt, courses, changements de girouette, pauses et retour au centre bus.
          </p>
        </div>

        {roster && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMobileFilters(s => !s)}
              className="lg:hidden px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white border border-white/10 transition-all"
            >
              {showMobileFilters ? 'Masquer les filtres' : 'Paramètres'}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              className="px-3.5 py-2 rounded-xl bg-[#DAE44E]/15 hover:bg-[#DAE44E]/25 text-xs font-black text-[#DAE44E] border border-[#DAE44E]/30 transition-all flex items-center space-x-1.5"
            >
              <Sparkles size={13} />
              <span>Regénérer</span>
            </button>
            <button
              type="button"
              onClick={() => { save(null); setShowMobileFilters(true); }}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-xs font-bold text-zinc-400 hover:text-rose-300 border border-white/10 transition-all"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* GRILLE PRINCIPALE PC (2 COLONNES : CONTRÔLES + SYNTHÈSE À GAUCHE / ITINÉRAIRE À DROITE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLONNE GAUCHE (4 COLONNES SUR PC, STICKY) : SYNTHÈSE & PARAMÈTRES */}
        <div className="lg:col-span-4 lg:sticky lg:top-20 space-y-5">
          
          {/* CARTE SYNTHÈSE DE LA FEUILLE ACTIVE */}
          {roster && (
            <div className="bg-[#100A38] border border-[#DAE44E]/40 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#080226] bg-[#DAE44E] px-2.5 py-0.5 rounded-full">
                  {roster.id}
                </span>
                <div className="flex items-center gap-1.5">
                  {roster.linesUsed?.map(name => {
                    const line = busData.lines.find(l => l.name === name);
                    return line ? (
                      <img key={name} src={line.logoUrl} alt={name} className="h-5 w-10 object-contain rounded bg-black/40 p-0.5" />
                    ) : null;
                  })}
                  {roster.startsTomorrow && (
                    <span className="text-[10px] font-mono font-bold uppercase text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
                      Demain
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">{roster.summary}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{roster.depotStart}</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block">Horaires</span>
                  <span className="text-xs font-mono font-black text-white mt-0.5 block">
                    {roster.startTime} → {roster.endTime}
                  </span>
                </div>
                <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block">Amplitude</span>
                  <span className="text-xs font-mono font-black text-[#DAE44E] mt-0.5 block">
                    {roster.estimatedDuration}
                  </span>
                </div>
                <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-2.5 text-center">
                  <span className="text-[9px] font-mono uppercase text-zinc-400 block">Conduite</span>
                  <span className="text-xs font-mono font-black text-white mt-0.5 block">
                    {roster.drivingDuration}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
                  <span>Progression ({roster.completedSteps}/{roster.totalSteps} courses)</span>
                  <span className="font-black text-[#DAE44E]">{progress}%</span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#DAE44E] h-full transition-all duration-700 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {nextStep && !allDone && (
                <button
                  type="button"
                  onClick={() => onLaunchService({
                    lineName: nextStep.lineName,
                    dirId: nextStep.dirId,
                    departureTime: nextStep.departureTime,
                    rosterStepNumber: nextStep.stepNumber
                  })}
                  className="w-full bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-[0.98] text-[#080226] px-4 py-3 rounded-2xl font-black text-xs uppercase flex items-center justify-center space-x-2 shadow-lg transition-all"
                >
                  <Bus size={15} />
                  <span>Lancer Course #{nextStep.stepNumber} • {nextStep.departureTime}</span>
                  <ArrowRight size={14} />
                </button>
              )}

              {allDone && (
                <div className="w-full px-4 py-3 rounded-2xl bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 font-black text-xs uppercase flex items-center justify-center space-x-2 animate-check-bounce">
                  <Check size={16} />
                  <span>Feuille de route terminée</span>
                </div>
              )}

              {roster.truncated && (
                <p className="text-[11px] text-amber-300 font-mono">
                  Feuille raccourcie : plus de départ dans les 2 h au terminus.
                </p>
              )}
            </div>
          )}

          {/* PANNEAU PARAMÈTRES / FILTRES DE GÉNÉRATION (Toujours visible sur PC, repliable sur mobile) */}
          <div className={`${showMobileFilters || !roster ? 'block' : 'hidden lg:block'} bg-[#100A38] border border-white/10 rounded-3xl p-5 shadow-xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs font-mono font-bold uppercase text-[#DAE44E] flex items-center space-x-1.5">
                <Sparkles size={14} />
                <span>Paramètres de la feuille</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-400">
                Dès {timeString?.slice(0, 5)}
              </span>
            </div>

            <div className="space-y-3.5">
              <Segmented
                label="Dépôt d'attache"
                value={depotFilter}
                onChange={setDepotFilter}
                options={[{ id: 'all', label: 'Auto' }, { id: 'berthee', label: 'Berthée' }, { id: 'courcelles', label: 'Courcelles' }]}
              />

              <Segmented
                label="Durée de service"
                value={durationType}
                onChange={setDurationType}
                options={[{ id: 'courte', label: '1 AR (2)' }, { id: 'moyenne', label: '2 AR (4)' }, { id: 'longue', label: '3 AR (6)' }]}
              />

              <div className="grid grid-cols-2 gap-3">
                <Segmented
                  label="Lignes"
                  value={serviceMode}
                  onChange={setServiceMode}
                  options={[{ id: 'interligne', label: 'Multi' }, { id: 'mono', label: 'Unique' }]}
                />
                <Segmented
                  label="Fin"
                  value={endMode}
                  onChange={setEndMode}
                  options={[{ id: 'depot', label: 'Dépôt' }, { id: 'terminus', label: 'Terminus' }]}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">Ligne de départ</label>
                <select
                  value={startLineFilter}
                  onChange={(e) => setStartLineFilter(e.target.value)}
                  className="w-full bg-[#180E4F] border border-white/10 text-white text-xs font-semibold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#DAE44E] transition-all"
                >
                  <option value="all">Aléatoire (toutes lignes)</option>
                  {(busData.lines || []).map(l => (
                    <option key={l.name} value={l.name}>Ligne {l.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIncludePause(p => !p)}
                className={`w-full py-2.5 px-3.5 rounded-2xl border text-xs font-mono font-bold flex items-center justify-between transition-all ${
                  includePause ? 'bg-[#DAE44E]/15 border-[#DAE44E]/40 text-[#DAE44E]' : 'bg-white/5 border-white/10 text-zinc-400'
                }`}
              >
                <span>Pause conducteur à mi-service</span>
                <span className={`w-9 h-5 rounded-full relative transition-colors ${includePause ? 'bg-[#DAE44E]' : 'bg-white/15'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-[#080226] transition-all ${includePause ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                className="w-full bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-[0.98] text-[#080226] font-black text-xs sm:text-sm uppercase py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl"
              >
                <Sparkles size={16} />
                <span>{roster ? 'Générer une autre feuille' : 'Générer ma feuille de route'}</span>
              </button>
            </div>

            {error && <p className="text-xs text-rose-300 font-mono">{error}</p>}
          </div>
        </div>

        {/* COLONNE DROITE (8 COLONNES SUR PC) : ITINÉRAIRE COMPLET */}
        <div className="lg:col-span-8 space-y-4">
          {roster ? (
            <>
              {/* BARRE D'EN-TÊTE ITINÉRAIRE + FILTRE D'AFFICHAGE */}
              <div className="bg-[#100A38] border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <MapPin size={15} className="text-[#DAE44E] shrink-0" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    Itinéraire de service détaillé
                  </span>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-[11px] font-mono font-bold self-start sm:self-auto">
                  {[
                    { id: 'all', label: `Tout (${roster.totalSteps})` },
                    { id: 'todo', label: `À faire (${roster.totalSteps - roster.completedSteps})` },
                    { id: 'done', label: `Faites (${roster.completedSteps})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setViewFilter(f.id)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        viewFilter === f.id ? 'bg-[#DAE44E] text-[#080226] font-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* TIMELINE ITINÉRAIRE */}
              <div>
                {items.length === 0 && (
                  <div className="bg-[#100A38] border border-white/5 rounded-2xl p-8 text-center text-xs text-zinc-400 font-mono">
                    Aucune étape dans ce filtre.
                  </div>
                )}

                {items.map((item, idx) => {
                  const isLast = idx === items.length - 1;
                  const filled = isFilled(item);

                  if (item.kind === 'start') {
                    const h = roster.hlpStart;
                    return (
                      <div key={item.key} className="flex gap-3 sm:gap-4">
                        <Rail
                          isLast={isLast}
                          filled={filled}
                          dot={<div className="w-9 h-9 rounded-xl bg-[#DAE44E] text-[#080226] flex items-center justify-center shadow-md"><Home size={16} /></div>}
                        />
                        <div className="flex-1 pb-4 min-w-0">
                          <div className="bg-[#140B47] border border-[#DAE44E]/25 rounded-2xl p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono font-black uppercase text-[#080226] bg-[#DAE44E] px-2 py-0.5 rounded">
                                  Sortie de dépôt • HLP
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[#DAE44E] bg-[#DAE44E]/15 border border-[#DAE44E]/30 px-2 py-0.5 rounded">
                                  GIR {h.girCode} • {h.girLabel}
                                </span>
                              </div>
                              <div className="text-sm sm:text-base font-black text-white truncate mt-1.5">
                                {h.depotName} <span className="text-[#DAE44E] mx-1">→</span> {h.targetStop}
                              </div>
                            </div>
                            <div className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-left sm:text-right shrink-0">
                              <div className="font-mono text-sm font-black text-[#DAE44E]">
                                {h.departureTime} → {h.arrivalTime}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                Mise en place ({h.durationMinutes} min)
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === 'pause') {
                    const p = item.step.pauseBefore;
                    const isPause = p.type === 'pause';
                    return (
                      <div key={item.key} className="flex gap-3 sm:gap-4">
                        <Rail
                          isLast={isLast}
                          filled={filled}
                          dot={
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 ${isPause ? 'border-amber-400 text-amber-300 bg-[#080226]' : 'border-white/25 text-zinc-400 bg-[#080226]'}`}>
                              <Clock size={12} />
                            </div>
                          }
                        />
                        <div className="flex-1 pb-4 min-w-0 flex items-center">
                          <div className={`w-full rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${isPause ? 'bg-amber-400/10 border border-amber-400/30 text-amber-200' : 'bg-white/[0.03] border border-white/5 text-zinc-400'}`}>
                            <span className="truncate">
                              <strong className={isPause ? 'text-amber-300 uppercase font-mono' : 'text-zinc-300 uppercase font-mono'}>{p.label}</strong> • Terminus {p.location}
                            </span>
                            <span className="font-mono font-bold shrink-0">
                              {p.startTime} → {p.endTime} ({p.durationMinutes} min)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.kind === 'end') {
                    const e = roster.hlpEnd;
                    const isDepot = e.type === 'retour_depot';
                    return (
                      <div key={item.key} className="flex gap-3 sm:gap-4">
                        <Rail
                          isLast
                          dot={
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${allDone ? 'bg-emerald-400 text-[#080226] animate-check-bounce' : 'bg-white/10 text-zinc-300 border border-white/15'}`}>
                              {allDone ? <Check size={16} /> : <Home size={16} />}
                            </div>
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`rounded-2xl p-4 sm:px-5 border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${allDone ? 'bg-emerald-950/30 border-emerald-400/40' : 'bg-[#140B47] border-white/10'}`}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-mono font-black uppercase text-[#DAE44E] bg-[#DAE44E]/15 border border-[#DAE44E]/30 px-2 py-0.5 rounded">
                                  {isDepot ? 'Retour centre bus • HLP' : 'Fin de service au terminus'}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                                  GIR {e.previousGirCode} → <strong className="text-[#DAE44E]">{e.girCode}</strong> ({e.girLabel})
                                </span>
                              </div>
                              <div className="text-sm sm:text-base font-black text-white truncate mt-1.5">
                                {isDepot ? (
                                  <>
                                    {e.fromStop} <span className="text-[#DAE44E] mx-1">→</span> {e.depotName}
                                  </>
                                ) : (
                                  `Stationnement à ${e.fromStop}`
                                )}
                              </div>
                            </div>
                            <div className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-left sm:text-right shrink-0">
                              <div className="font-mono text-sm font-black text-white">
                                {isDepot ? `${e.departureTime} → ${e.arrivalTime}` : e.arrivalTime}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400">
                                {isDepot ? `Haut-le-Pied (${e.durationMinutes} min)` : 'Coupure moteur'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Course commerciale
                  const step = item.step;
                  const isDone = step.isCompleted;
                  const isCurrent = nextStep?.stepNumber === step.stepNumber;
                  const justDone = isDone && step.justCompletedAt && Date.now() - step.justCompletedAt < 8000;

                  return (
                    <div key={item.key} className="flex gap-3 sm:gap-4">
                      <Rail
                        isLast={isLast}
                        filled={filled}
                        dot={
                          <button
                            type="button"
                            onClick={() => handleToggleStep(step.stepNumber)}
                            title={isDone ? 'Décocher la course' : 'Cocher la course'}
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-black text-xs transition-all ${
                              isDone
                                ? `bg-emerald-400 text-[#080226] ${justDone ? 'animate-check-bounce' : ''}`
                                : isCurrent
                                ? 'bg-[#DAE44E] text-[#080226] ring-4 ring-[#DAE44E]/20'
                                : 'bg-[#180E4F] text-zinc-300 border-2 border-white/20 hover:border-[#DAE44E]'
                            }`}
                          >
                            {isDone ? <Check size={16} /> : step.stepNumber}
                          </button>
                        }
                      />

                      <div className="flex-1 pb-4 min-w-0">
                        <div
                          className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                            justDone
                              ? 'bg-emerald-950/30 border-emerald-400 animate-autocheck-pop'
                              : isDone
                              ? 'bg-emerald-950/15 border-emerald-500/25 opacity-75'
                              : isCurrent
                              ? 'bg-[#130B42] border-[#DAE44E]/70 shadow-[0_0_25px_rgba(218,228,78,0.08)]'
                              : 'bg-[#100A38] border-white/10 hover:border-white/20'
                          }`}
                        >
                          {/* Ligne supérieure : Logo + Badges + Changement Girouette */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/5">
                            <div className="flex flex-wrap items-center gap-2">
                              <img src={step.logoUrl} alt={step.lineName} className="h-6 w-12 object-contain rounded bg-black/40 p-0.5" />
                              <span className="text-[11px] font-mono font-black uppercase text-white">
                                {step.label}
                              </span>
                              {step.isLineChange && (
                                <span className="text-[10px] font-mono font-black uppercase bg-[#DAE44E] text-[#080226] px-2 py-0.5 rounded-md">
                                  Changement de ligne
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-mono text-zinc-300 bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg">
                              GIR {step.previousGirCode} → <strong className="text-[#DAE44E]">{step.code}</strong>
                            </span>
                          </div>

                          {/* Corps de la course : Horaires + Trajet + Actions sur une ligne fluide sur PC */}
                          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                              {/* Bloc Horaires */}
                              <div className="bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 shrink-0 flex sm:flex-col items-center sm:items-start justify-between gap-2 sm:gap-0.5">
                                <div className="font-mono text-sm sm:text-base font-black text-[#DAE44E]">
                                  {step.departureTime} <span className="text-zinc-500">→</span> <span className="text-white">{step.arrivalTime}</span>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-400">
                                  {step.durationMinutes} min • {step.stopsCount} arrêts
                                </div>
                              </div>

                              {/* Bloc Origine -> Destination */}
                              <div className="min-w-0">
                                <div className="text-sm sm:text-base font-black text-white truncate">
                                  {step.origin} <span className="text-[#DAE44E] mx-1">→</span> {step.destination}
                                </div>
                                {step.viaStops?.length > 0 && (
                                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-1 truncate">
                                    <MapPin size={11} className="text-[#DAE44E] shrink-0" />
                                    <span className="truncate">via {step.viaStops.join(' • ')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions à droite */}
                            <div className="flex items-center justify-end gap-2 shrink-0 pt-2 xl:pt-0 border-t xl:border-t-0 border-white/5">
                              {!isDone && (
                                <button
                                  type="button"
                                  onClick={() => onLaunchService({
                                    lineName: step.lineName,
                                    dirId: step.dirId,
                                    departureTime: step.departureTime,
                                    rosterStepNumber: step.stepNumber
                                  })}
                                  className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase flex items-center space-x-1.5 transition-all active:scale-95 ${
                                    isCurrent
                                      ? 'bg-[#DAE44E] hover:bg-[#E5EE60] text-[#080226] shadow-md'
                                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                                  }`}
                                >
                                  <Bus size={14} />
                                  <span>Lancer au pupitre</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleStep(step.stepNumber)}
                                className={`px-3 py-2.5 rounded-xl font-mono font-bold text-xs border transition-all flex items-center space-x-1.5 ${
                                  isDone
                                    ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
                                }`}
                              >
                                <Check size={14} />
                                <span>{isDone ? 'Terminée' : 'Cocher'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-[#100A38] border border-white/10 rounded-3xl p-10 lg:p-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#DAE44E]/10 border border-[#DAE44E]/30 text-[#DAE44E] flex items-center justify-center mx-auto">
                <List size={26} />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-black text-white">Aucune feuille de route active</h3>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Utilisez le panneau de gauche pour configurer votre prise de service (dépôt, durée, lignes) et générer votre itinéraire complet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="inline-flex items-center space-x-2 bg-[#DAE44E] hover:bg-[#E5EE60] text-[#080226] font-black text-xs uppercase px-5 py-3 rounded-2xl transition-all shadow-lg"
              >
                <Sparkles size={15} />
                <span>Générer maintenant</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
