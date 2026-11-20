import React from 'react';

// Onglet « Grille horaire » : tous les départs de la direction
export default function TimetableTab({ svc }) {
  const {
    departureTime,
    allLineStops,
    availableTrips,
    activeLine,
  } = svc;

  return (
    <div className="bg-sse-panel border border-white/10 rounded-xl p-5 flex flex-col h-[calc(100vh-270px)] min-h-[440px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
        <span className="text-sm font-semibold text-zinc-300">
          Grille des Départs • Ligne {activeLine.name}
        </span>
        <span className="text-[10px] text-zinc-300 font-mono">
          {availableTrips.length} départs
        </span>
      </div>

      <div className="flex-1 overflow-auto border border-white/10 rounded-lg mt-2">
        <table className="w-full text-xs font-mono">
          <thead className="bg-sse-deep sticky top-0 border-b border-white/10 z-20">
            <tr>
              <th className="p-2.5 text-left font-bold text-sse-yellow sticky left-0 bg-sse-deep z-30 whitespace-nowrap">
                Arrêt
              </th>
              {availableTrips.map(t => (
                <th 
                  key={t.tripId} 
                  className={`p-2.5 text-center whitespace-nowrap ${
                    t.effectiveDepartureTime === departureTime ? 'bg-sse-yellow text-sse-night font-bold' : 'text-zinc-300'
                  }`}
                >
                  {t.effectiveDepartureTime}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allLineStops.map(stopName => (
              <tr key={stopName} className="hover:bg-white/[0.03]">
                <td className="p-2.5 font-sans font-medium text-white sticky left-0 bg-sse-panel z-10 whitespace-nowrap border-r border-white/5">
                  {stopName}
                </td>
                {availableTrips.map(t => {
                  const stopData = t.effectiveStops.find(s => s.stop.toLowerCase() === stopName.toLowerCase());
                  return (
                    <td key={t.tripId} className="p-2.5 text-center text-zinc-400 whitespace-nowrap">
                      {stopData?.time || '|'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
