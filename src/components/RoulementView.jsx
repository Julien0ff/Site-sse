import React, { useState } from 'react';
import { List, Sparkles, Check, ArrowRight } from '@getpapillon/papicons';
import { generateRandomRoulement } from '../utils/roulementGenerator.js';
import { setStoredActiveRoster } from '../utils/storageUtils.js';

export default function RoulementView({ busData, activeRoster, setActiveRoster, onLaunchService, timeString }) {
  const [durationType, setDurationType] = useState('moyenne');
  const [startLineFilter, setStartLineFilter] = useState('all');

  const handleGenerate = () => {
    const r = generateRandomRoulement(busData, {
      durationType,
      startLineName: startLineFilter === 'all' ? null : startLineFilter,
      startTime: timeString?.slice(0, 5) || '14:00'
    });
    if (r) {
      setActiveRoster(r);
      setStoredActiveRoster(r);
    }
  };

  const handleToggleStep = (stepNumber) => {
    if (!activeRoster) return;
    const updatedSteps = activeRoster.steps.map(s => {
      if (s.stepNumber === stepNumber) {
        return { ...s, isCompleted: !s.isCompleted };
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

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Feuille de route
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Enchaînements aller-retour et changements de ligne aux terminus.
          </p>
        </div>

        {activeRoster && (
          <button
            onClick={handleClearRoster}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-400 hover:text-white border border-white/10 self-start sm:self-auto transition-all"
          >
            Effacer
          </button>
        )}
      </div>

      {/* GÉNÉRATEUR */}
      <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
              Durée
            </label>
            <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-2xl border border-white/5 text-xs font-mono font-bold">
              {[
                { id: 'courte', label: '1 AR' },
                { id: 'moyenne', label: '2 AR' },
                { id: 'longue', label: '3 AR' }
              ].map(opt => (
                <button
                  key={opt.id}
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono font-bold uppercase text-zinc-400">
               Première ligne
            </label>
            <select
              value={startLineFilter}
              onChange={(e) => setStartLineFilter(e.target.value)}
              className="w-full bg-[#180E4F] border border-white/10 text-white text-xs font-semibold rounded-2xl p-3 focus:outline-none focus:border-[#DAE44E] transition-all h-[42px]"
            >
              <option value="all">Aléatoire</option>
              {(busData.lines || []).map(l => (
                <option key={l.name} value={l.name}>
                  Ligne {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              className="w-full bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-[0.98] text-[#080226] font-black text-xs sm:text-sm uppercase py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-xl h-[42px]"
            >
              <Sparkles size={16} />
              <span>Générer</span>
            </button>
          </div>
        </div>
      </div>

      {/* FEUILLE DE ROUTE ACTIVE */}
      {activeRoster ? (
        <div className="space-y-4">
          <div className="bg-[#100A38] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-[#080226] bg-[#DAE44E] px-2.5 py-0.5 rounded-full">
                  {activeRoster.id}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  ~{activeRoster.estimatedDuration}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {activeRoster.summary}
              </h3>
            </div>

            <div className="sm:text-right space-y-1.5 shrink-0">
              <div className="text-xs font-mono font-bold text-white">
                {activeRoster.completedSteps} / {activeRoster.totalSteps} services
              </div>
              <div className="w-44 bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#DAE44E] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(activeRoster.completedSteps / activeRoster.totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {activeRoster.steps.map((step) => {
              const isDone = step.isCompleted;

              return (
                <div
                  key={step.stepNumber}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                      : 'bg-[#100A38] border-white/10 hover:border-[#DAE44E]/30 shadow-xl'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 text-black'
                        : 'bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30'
                    }`}>
                      {isDone ? <Check size={16} /> : step.stepNumber}
                    </div>

                    <img
                      src={step.logoUrl}
                      alt={step.lineName}
                      className="h-8 w-16 object-contain rounded bg-black/30 p-0.5 shrink-0"
                    />

                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold text-[#DAE44E] uppercase">
                          {step.label}
                        </span>
                        <span className="text-[10px] font-mono bg-white/10 text-zinc-300 px-1.5 py-0.2 rounded">
                          GIR {step.code}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white truncate mt-0.5">
                        {step.origin} ➔ <strong className="text-[#DAE44E]">{step.destination}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end space-x-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-left md:text-right pr-2 font-mono text-sm font-black text-white">
                      {step.departureTime} ➔ {step.arrivalTime}
                    </div>

                    <button
                      onClick={() => onLaunchService({
                        lineName: step.lineName,
                        dirId: step.dirId,
                        departureTime: step.departureTime
                      })}
                      className="bg-[#DAE44E] hover:bg-[#E5EE60] active:scale-95 text-[#080226] px-3.5 py-2 rounded-xl font-black text-xs uppercase flex items-center space-x-1.5 shadow-md transition-all"
                    >
                      <span>Pupitre</span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      onClick={() => handleToggleStep(step.stepNumber)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        isDone
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[#100A38] border border-white/5 rounded-3xl p-10 text-center space-y-3 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#DAE44E]/10 border border-[#DAE44E]/20 text-[#DAE44E] flex items-center justify-center mx-auto">
            <List size={24} />
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Aucune feuille de route générée.
          </p>
        </div>
      )}
    </div>
  );
}
