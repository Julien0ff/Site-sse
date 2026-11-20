import React, { useState, useMemo } from 'react';
import { Search, Cross, MapPin, Clock, Bus, ArrowRight } from '@getpapillon/papicons';
import { buildAllStopsDirectory, getNextDeparturesForStop } from '../utils/passengerUtils.js';

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

  const allStops = useMemo(() => buildAllStopsDirectory(busData), [busData]);

  const filteredStops = useMemo(() => {
    return allStops.filter(stop => {
      const matchesLine = selectedLineFilter === 'all' || stop.lines.some(l => l.lineName === selectedLineFilter);
      if (!matchesLine) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        stop.name.toLowerCase().includes(q) ||
        stop.lines.some(l => l.lineName.toLowerCase().includes(q))
      );
    });
  }, [allStops, searchQuery, selectedLineFilter]);

  const nextDepartures = useMemo(() => {
    if (!selectedStop) return [];
    return getNextDeparturesForStop(busData, selectedStop.name, effectiveClock, 20);
  }, [busData, selectedStop, effectiveClock]);

  return (
    <>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="font-sign text-3xl sm:text-4xl font-bold text-white">
              Horaires aux arrêts
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              Choisissez un arrêt pour voir les prochains passages. En gras : arrêts desservis par plusieurs lignes.
            </p>
          </div>

          <div className="w-full md:w-80 lg:w-96">
            <div className="flex items-center bg-sse-panel border border-sse-line rounded-lg px-3.5 py-2.5 focus-within:border-zinc-400 transition-all">
              <Search size={16} className="shrink-0 mr-2.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nom d’arrêt ou numéro de ligne"
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
            className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold shrink-0 transition-all border ${selectedLineFilter === 'all'
              ? 'bg-sse-yellow text-sse-night border-sse-yellow font-bold' : 'bg-sse-panel text-zinc-300 border-white/10 hover:border-white/25'
              }`}
          >
            Toutes ({allStops.length})
          </button>

          {(busData.lines || []).map(line => (
            <button
              key={line.lineId}
              onClick={() => setSelectedLineFilter(line.name)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold shrink-0 transition-all border flex items-center space-x-2 ${selectedLineFilter === line.name
                ? 'bg-sse-raised text-white border-white' : 'bg-sse-panel text-zinc-300 border-white/10 hover:border-white/25'
                }`}
            >
              <img src={line.logoUrl} alt={`Ligne ${line.name}`} className="h-5 w-10 object-contain" />
            </button>
          ))}
        </div>

        {/* INDEX DES ARRÊTS : liste dense, comme un plan de réseau */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 [column-rule:1px_solid_#2A2160]">
          {filteredStops.map(stop => {
            const isSelected = selectedStop?.name === stop.name;

            return (
              <button
                key={stop.name}
                type="button"
                onClick={() => setSelectedStop(stop)}
                className={`w-full break-inside-avoid flex items-center justify-between gap-3 px-2 py-2 rounded-md text-left transition-colors ${isSelected
                  ? 'bg-sse-raised' : 'hover:bg-sse-panel'
                  }`}
              >
                <span className={`text-[15px] truncate ${stop.lines.length >= 2 ? 'font-semibold text-white' : 'text-zinc-200'}`}>
                  {stop.name}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  {stop.lines.map(l => (
                    <img
                      key={l.lineName}
                      src={l.logoUrl}
                      alt={`Ligne ${l.lineName}`}
                      className="h-4 w-8 object-contain"
                    />
                  ))}
                </span>
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
            className="w-full max-w-2xl bg-sse-panel border border-sse-yellow/40 rounded-xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête de l'arrêt */}
            <div className="p-5 sm:p-6 bg-sse-raised border-b border-white/10 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold bg-sse-yellow text-sse-night px-2.5 py-0.5 rounded-full">
                    Prochains Passages
                  </span>
                  <span className="text-xs font-mono text-zinc-300">
                    {timeString}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                  {selectedStop.name}
                </h3>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {selectedStop.lines.map(l => (
                    <img
                      key={l.lineName}
                      src={l.logoUrl}
                      alt={l.lineName}
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
                      className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 transition-all ${isImminent
                        ? 'bg-sse-yellow/15 border-sse-yellow/50' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
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
                            {dep.isLimitedService && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
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
                          className={`font-mono text-sm sm:text-base font-bold px-3 py-1 rounded-md border ${isImminent
                            ? 'bg-sse-yellow text-sse-night border-sse-yellow'
                            : isSoon
                              ? 'bg-sse-yellow/15 text-sse-yellow border-sse-yellow/30' : 'bg-white/5 text-white border-white/10'
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
