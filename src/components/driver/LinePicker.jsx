import React, { useState, useMemo } from 'react';
import { ChevronRight, Search, Cross } from '@getpapillon/papicons';

// Étape 1 : choix de la ligne et de la direction
export default function LinePicker({ svc, busData }) {
  const {
    setStep,
    setSelectedDirection,
    setDepartureTime,
    setCurrentStopIndex,
    setDelayMinutes,
  } = svc;

  const [searchQuery, setSearchQuery] = useState('');

  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return busData.lines;
    const q = searchQuery.toLowerCase().trim();
    return busData.lines.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.lineId.includes(q) ||
      l.directions.some(d => d.code.toLowerCase().includes(q) || d.destination.toLowerCase().includes(q) || d.origin.toLowerCase().includes(q)) ||
      (l.girCodes && l.girCodes.some(g => g.code.toLowerCase().includes(q) || g.destination.toLowerCase().includes(q)))
    );
  }, [busData, searchQuery]);

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-sm text-zinc-400">
            Étape 1 sur 3
          </span>
          <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mt-1.5">Choisir une ligne</h2>
          <p className="text-xs lg:text-sm text-zinc-300 mt-0.5">Toutes les lignes du réseau Seine-Sud-Est.</p>
        </div>

        {/* Barre de Recherche Responsive */}
        <div className="w-full sm:w-80 lg:w-96">
          <div className="flex items-center bg-sse-panel border border-sse-yellow/20 rounded-lg px-3.5 py-2.5 focus-within:border-sse-yellow/60 transition-all">
            <Search size={16} color="#DAE44E" className="shrink-0 mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ligne, arrêt ou code girouette"
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

      {/* Grille Responsive des Lignes (1 col mobile, 2 col tablette, 3 col desktop, 4 col grand écran) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-1">
        {filteredLines.map(line => (
          <div 
            key={line.lineId}
            className="bg-sse-panel border border-white/10 hover:border-sse-yellow/30 rounded-xl p-4 transition-all flex flex-col justify-between"
          >
            <div>
              {/* En-tête Ligne avec Logo uniforme */}
              <div className="flex items-center space-x-3 mb-3">
                <img 
                  src={line.logoUrl} 
                  alt={`Ligne ${line.name}`} 
                  className="h-8 w-16 object-contain rounded-md shrink-0 bg-black/30 p-0.5"
                />
                <div className="flex-1">
                  <span className="text-xs font-bold text-zinc-300">Ligne {line.name}</span>
                  <div className="text-sm font-extrabold text-white">
                    {line.directions.length} directions disponibles
                  </div>
                </div>
              </div>

              {/* Directions */}
              <div className="space-y-2">
                {line.directions.map(dir => (
                  <button
                    key={dir.dirId}
                    onClick={() => {
                      setSelectedDirection(dir);
                      setDepartureTime('');
                      setCurrentStopIndex(0);
                      setDelayMinutes(0);
                      setStep('select-time');
                    }}
                    className="w-full text-left bg-white/[0.04] hover:bg-sse-yellow/10 active:scale-[0.98] border border-white/5 hover:border-sse-yellow/30 p-3 rounded-lg flex items-center justify-between transition-all group"
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-sse-yellow/15 text-sse-yellow border border-sse-yellow/30">
                          GIR {dir.code}
                        </span>
                        <span className="text-[10px] text-zinc-400">{dir.status}</span>
                      </div>
                      <div className="text-sm font-bold text-white truncate transition-transform">
                        {dir.destination}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Départ : {dir.origin}
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-sse-yellow group-hover:text-sse-night transition-colors">
                      <ChevronRight size={16} className="text-white group-hover:text-sse-night" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
