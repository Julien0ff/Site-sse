import React from 'react';

// Onglet « Codes girouette » : code en cours, codes de la ligne et codes spéciaux
export default function GirouetteTab({ svc, busData }) {
  const {
    selectedDirection,
    activeLine,
  } = svc;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      {/* Colonne Gauche : Girouette en cours & Codes officiels de la ligne */}
      <div className="lg:col-span-6 space-y-4">
        {/* Girouette en cours */}
        <div className="bg-sse-panel border border-sse-yellow/30 rounded-xl p-5">
          <span className="text-sm font-semibold text-zinc-300 block mb-2.5">
            Girouette en cours
          </span>
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[10px] text-zinc-400 font-mono block">Code Pupitre</span>
              <span className="text-2xl font-mono font-bold text-sse-yellow">{selectedDirection.code}</span>
              <div className="text-sm font-bold text-white truncate mt-0.5">
                {selectedDirection.destination}
              </div>
            </div>
            <div className="shrink-0 bg-sse-yellow/20 text-sse-yellow border border-sse-yellow/40 px-3 py-1 rounded-full text-[10px] font-mono font-bold">
              ACTIF
            </div>
          </div>
        </div>

        {/* Codes Girouettes Officiels de la Ligne */}
        {activeLine.girCodes && activeLine.girCodes.length > 0 && (
          <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-sm font-semibold text-zinc-300">
                Codes GIR Ligne {activeLine.name}
              </span>
              <span className="text-[10px] text-sse-yellow font-mono font-bold">
                {activeLine.girCodes.length} codes
              </span>
            </div>

            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {activeLine.girCodes.map((g, idx) => {
                const isCurrent = g.code.toUpperCase() === selectedDirection.code.toUpperCase();
                return (
                  <div 
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-sse-yellow/15 border-sse-yellow/40' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-bold text-white truncate">
                        {g.destination}
                      </div>
                      {g.city && (
                        <div className="text-[10px] text-zinc-400 font-mono truncate">
                          {g.city}
                        </div>
                      )}
                    </div>
                    <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md shrink-0 ${
                      isCurrent
                        ? 'bg-sse-yellow text-sse-night' : 'bg-white/10 text-white border border-white/10'
                    }`}>
                      {g.code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Colonne Droite : Codes Girouettes Spéciaux (HLP) */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-sm font-semibold text-zinc-300">
              Codes Spéciaux Girouette
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">
              {busData.specialCodes.length} codes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-1">
            {busData.specialCodes.map(sc => (
              <div key={sc.code} className="bg-white/[0.03] hover:bg-white/[0.07] p-3 rounded-lg flex items-center justify-between border border-white/5 transition-all">
                <span className="text-xs font-bold text-white tracking-wide truncate pr-2">{sc.name}</span>
                <span className="font-mono font-bold text-xs bg-sse-yellow/15 text-sse-yellow px-2.5 py-1 rounded-md border border-sse-yellow/30 shrink-0">
                  {sc.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
