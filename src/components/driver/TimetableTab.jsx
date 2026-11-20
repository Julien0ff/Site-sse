import React, { useEffect, useMemo, useRef, useState } from 'react';

const AROUND = 5; // départs affichés de part et d'autre du mien

// Onglet « Grille horaire » : tous les départs de la direction
export default function TimetableTab({ svc }) {
  const {
    departureTime,
    allLineStops,
    availableTrips,
    activeLine,
    activeTripStops,
    currentStopIndex,
    isInService,
    secondsUntilStop,
  } = svc;

  const [range, setRange] = useState('around'); // 'around' | 'day'
  const scrollRef = useRef(null);
  const selectedHeadRef = useRef(null);

  const selectedIdx = availableTrips.findIndex(t => t.effectiveDepartureTime === departureTime);

  const trips = useMemo(() => {
    if (range === 'day' || selectedIdx < 0) return availableTrips;
    return availableTrips.slice(Math.max(0, selectedIdx - AROUND), selectedIdx + AROUND + 1);
  }, [range, availableTrips, selectedIdx]);

  // Index arrêt -> horaire, une fois par course (évite une recherche par cellule)
  const timesByTrip = useMemo(() => {
    const map = new Map();
    for (const t of trips) {
      map.set(t.tripId, new Map(t.effectiveStops.map(s => [s.stop.toLowerCase(), s.time])));
    }
    return map;
  }, [trips]);

  const currentStopName = isInService ? activeTripStops[currentStopIndex]?.stop?.toLowerCase() : null;

  // Vue journée : amener ma colonne au centre
  useEffect(() => {
    const box = scrollRef.current;
    const head = selectedHeadRef.current;
    if (!box || !head) return;
    box.scrollLeft = head.offsetLeft - box.clientWidth / 2 + head.clientWidth / 2;
  }, [range]);

  return (
    <section className="bg-sse-panel border border-white/10 rounded-xl overflow-hidden" aria-label="Grille horaire">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-3 border-b border-white/10">
        <div>
          <h3 className="text-sm font-semibold text-white">Ligne {activeLine.name}, vers {activeTripStops[activeTripStops.length - 1]?.stop}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {range === 'around'
              ? `${trips.length} départs autour du vôtre, sur ${availableTrips.length} dans la journée`
              : `${availableTrips.length} départs dans la journée`}
          </p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-lg text-sm font-semibold self-start sm:self-auto" role="group" aria-label="Plage affichée">
          {[
            { id: 'around', label: 'Autour de mon départ' },
            { id: 'day', label: 'Journée entière' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              aria-pressed={range === opt.id}
              onClick={() => setRange(opt.id)}
              className={`px-3 py-1.5 rounded-md transition-colors ${range === opt.id ? 'bg-white text-sse-night' : 'text-zinc-400 hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="overflow-auto custom-scrollbar max-h-[65vh] lg:max-h-[calc(100vh-300px)]">
        <table className="border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky top-0 left-0 z-30 bg-sse-deep text-left font-semibold text-zinc-300 px-4 py-2.5 border-b border-r border-white/10 min-w-[200px] lg:min-w-[260px]">
                Arrêt
              </th>
              {trips.map(t => {
                const isMine = t.effectiveDepartureTime === departureTime;
                const departed = !isMine && secondsUntilStop(t.effectiveDepartureTime) < -60;
                return (
                  <th
                    key={t.tripId}
                    scope="col"
                    ref={isMine ? selectedHeadRef : undefined}
                    className={`sticky top-0 z-20 px-3 py-2 border-b border-white/10 font-mono whitespace-nowrap text-center ${
                      isMine ? 'bg-sse-yellow text-sse-night' : 'bg-sse-deep ' + (departed ? 'text-zinc-500' : 'text-white')
                    }`}
                  >
                    <span className="block font-semibold">{t.effectiveDepartureTime}</span>
                    <span className={`block text-[11px] font-sans font-normal ${isMine ? 'text-sse-night/70' : 'text-zinc-500'}`}>
                      {isMine ? 'mon départ' : t.isLimitedService ? 'partiel' : `arr. ${t.arrivalTime}`}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allLineStops.map(stopName => {
              const key = stopName.toLowerCase();
              const isCurrentRow = key === currentStopName;
              return (
                <tr key={stopName} className={isCurrentRow ? 'bg-sse-raised' : 'hover:bg-white/[0.03]'}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 text-left font-medium px-4 py-2 border-r border-b border-white/5 whitespace-nowrap ${
                      isCurrentRow ? 'bg-sse-raised text-white' : 'bg-sse-panel text-zinc-200'
                    }`}
                  >
                    {isCurrentRow && <span className="inline-block w-1.5 h-1.5 rounded-full bg-sse-yellow mr-2 align-middle" aria-label="Prochain arrêt" />}
                    {stopName}
                  </th>
                  {trips.map(t => {
                    const time = timesByTrip.get(t.tripId)?.get(key);
                    const isMine = t.effectiveDepartureTime === departureTime;
                    const departed = !isMine && secondsUntilStop(t.effectiveDepartureTime) < -60;
                    return (
                      <td
                        key={t.tripId}
                        className={`px-3 py-2 text-center font-mono whitespace-nowrap border-b border-white/5 ${
                          isMine
                            ? `bg-sse-yellow/10 ${isCurrentRow ? 'text-sse-yellow font-semibold' : 'text-white'}`
                            : time ? (departed ? 'text-zinc-600' : 'text-zinc-300') : 'text-zinc-700'
                        }`}
                      >
                        {time || '—'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
