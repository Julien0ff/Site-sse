import React, { useState, useMemo } from 'react';
import { Search, Cross, MapPin, Clock, Bus, ArrowRight } from '@getpapillon/papicons';
import { getAllNetworkStops, getUpcomingDeparturesForStop } from '../utils/passengerUtils.js';

function formatWaitTime(diffMinutes) {
  if (diffMinutes === 0) return "À l'approche";
  if (diffMinutes >= 60) {
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
  return `${diffMinutes} min`;
}

export default function PassengerView({ busData, effectiveClock, timeString }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLineFilter, setSelectedLineFilter] = useState('all');
  const [selectedStop, setSelectedStop] = useState(null);

  const allStops = useMemo(() => getAllNetworkStops(busData), [busData]);

  const filteredStops = useMemo(() => {
    return allStops.filter(stop => {
      const matchesLine = selectedLineFilter === 'all' || stop.lines.some(l => l.name === selectedLineFilter);
      if (!matchesLine) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        stop.name.toLowerCase().includes(q) ||
        stop.lines.some(l => l.name.toLowerCase().includes(q))
      );
    });
  }, [allStops, searchQuery, selectedLineFilter]);

  const nextDepartures = useMemo(() => {
    if (!selectedStop) return [];
    return getUpcomingDeparturesForStop(selectedStop.name, busData, effectiveClock, 20);
  }, [busData, selectedStop, effectiveClock]);

  return (
    <>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Arrêts & Correspondances
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Cliquez sur un arrêt pour voir ses prochains passages.
            </p>
          </div>

          <div className="w-full md:w-80 lg:w-96">
            <div className="flex items-center bg-[#100A38] border border-[#DAE44E]/20 rounded-2xl px-3.5 py-2.5 focus-within:border-[#DAE44E] transition-all shadow-md">
              <Search size={16} color="#DAE44E" className="shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un arrêt ou une ligne..."
                className="bg-transparent text-sm font-medium text-white placeholder:text-zinc-400 focus:outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-white p-1">
                  <Cross size={12} className="shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FILTRES PAR LIGNE */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setSelectedLineFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold shrink-0 transition-all border ${
              selectedLineFilter === 'all'
                ? 'bg-[#DAE44E] text-[#080226] border-[#DAE44E] font-black shadow-md'
                : 'bg-[#100A38] text-zinc-300 border-white/10 hover:border-white/25'
            }`}
          >
            Toutes ({allStops.length})
          </button>

          {(busData.lines || []).map(line => (
            <button
              key={line.lineId}
              onClick={() => setSelectedLineFilter(line.name)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border flex items-center space-x-2 ${
                selectedLineFilter === line.name
                  ? 'bg-[#DAE44E]/20 text-white border-[#DAE44E] shadow-md'
                  : 'bg-[#100A38] text-zinc-300 border-white/10 hover:border-white/25'
              }`}
            >
              <img src={line.logoUrl} alt={line.name} className="h-4 w-8 object-contain rounded" />
              <span>{line.name}</span>
            </button>
          ))}
        </div>

        {/* GRILLE DES ARRÊTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredStops.map(stop => {
            const isSelected = selectedStop?.name === stop.name;
            const isHub = stop.lines.length >= 2;

            return (
              <button
                key={stop.name}
                type="button"
                onClick={() => setSelectedStop(stop)}
                className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-[#1C1058] border-[#DAE44E] shadow-xl'
                    : 'bg-[#100A38] border-white/10 hover:border-[#DAE44E]/40 hover:bg-[#140C44]'
                }`}
              >
                <div className="space-y-2.5 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <MapPin
                        size={15}
                        color={isHub ? '#DAE44E' : '#A1A1AA'}
                        className="shrink-0 mt-0.5"
                      />
                      <span className="font-bold text-sm text-white truncate group-hover:text-[#DAE44E] transition-colors">
                        {stop.name}
                      </span>
                    </div>

                    {isHub && (
                      <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-[#DAE44E]/15 text-[#DAE44E] border border-[#DAE44E]/30 shrink-0">
                        {stop.lines.length} lignes
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {stop.lines.map(l => (
                      <img
                        key={l.name}
                        src={l.logoUrl}
                        alt={`Ligne ${l.name}`}
                        className="h-5 w-10 object-contain rounded bg-black/30 p-0.5 border border-white/5"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[11px] text-zinc-400 group-hover:text-white transition-colors">
                  <span>Voir les départs</span>
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform text-[#DAE44E]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MODALE DES PROCHAINS DÉPARTS (hors du conteneur animé pour centrage écran garanti) */}
      {selectedStop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedStop(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#100A38] border border-[#DAE44E]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête de l'arrêt */}
            <div className="p-5 sm:p-6 bg-[#180E4F] border-b border-white/10 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider bg-[#DAE44E] text-[#080226] px-2.5 py-0.5 rounded-full">
                    Prochains Passages
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    {timeString}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                  {selectedStop.name}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {selectedStop.lines.map(l => (
                    <img
                      key={l.name}
                      src={l.logoUrl}
                      alt={l.name}
                      className="h-5 w-10 object-contain rounded bg-black/40 p-0.5 border border-white/10"
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStop(null)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all"
              >
                <Cross size={18} />
              </button>
            </div>

            {/* Liste des prochains départs */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 custom-scrollbar">
              {nextDepartures.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-sm">
                  Aucun départ trouvé pour cet arrêt.
                </div>
              ) : (
                nextDepartures.map((dep, idx) => {
                  const isImminent = dep.diffMinutes <= 2;
                  const isSoon = dep.diffMinutes <= 10;

                  return (
                    <div
                      key={`${dep.lineName}-${dep.code}-${dep.time}-${idx}`}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isImminent
                          ? 'bg-[#DAE44E]/15 border-[#DAE44E]/50'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={dep.logoUrl}
                          alt={dep.lineName}
                          className="h-8 w-16 object-contain rounded bg-black/40 p-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-extrabold text-white truncate">
                              ➔ {dep.destination}
                            </span>
                            {(dep.isLimited || dep.isLimitedService) && (
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                                Partiel
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono flex items-center space-x-2 mt-0.5">
                            <span>GIR {dep.code}</span>
                            <span>•</span>
                            <span>Passage à {dep.time}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono text-sm sm:text-base font-black px-3 py-1 rounded-xl border ${
                            isImminent
                              ? 'bg-[#DAE44E] text-[#080226] border-[#DAE44E] animate-pulse'
                              : isSoon
                              ? 'bg-[#DAE44E]/15 text-[#DAE44E] border-[#DAE44E]/30'
                              : 'bg-white/5 text-white border-white/10'
                          }`}
                        >
                          {formatWaitTime(dep.diffMinutes)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
