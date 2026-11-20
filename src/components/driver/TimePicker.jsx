import React, { useState, useMemo } from 'react';
import { MapPin, ArrowRight, ArrowRightDown } from '@getpapillon/papicons';

// Étape 2 : point de prise de service (haut-le-pied) et horaire
export default function TimePicker({ svc }) {
  const {
    setStep,
    selectedDirection,
    departureTime,
    setDepartureTime,
    setCurrentStopIndex,
    setDelayMinutes,
    selectedSpawnStop,
    setSelectedSpawnStop,
    activeSheet,
    lineSpawnStops,
    availableTrips,
    nextScheduledTrip,
    activeLine,
  } = svc;

  const [serviceFilter, setServiceFilter] = useState('all'); // 'all' | 'full' | 'limited'

  const filteredTrips = useMemo(() => {
    if (serviceFilter === 'full') return availableTrips.filter(t => !t.isLimitedService);
    if (serviceFilter === 'limited') return availableTrips.filter(t => t.isLimitedService);
    return availableTrips;
  }, [availableTrips, serviceFilter]);

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Colonne Gauche : Ligne, Haut-le-Pied & Prochain départ recommandé */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          
          {/* Ligne sélectionnée */}
          <div className="bg-sse-panel border border-white/10 rounded-xl p-5 flex items-center space-x-4">
            <img 
              src={activeLine.logoUrl} 
              alt={`Ligne ${activeLine.name}`} 
              className="h-10 w-20 object-contain rounded-md shrink-0 bg-black/30 p-0.5"
            />
            <div className="flex-1 truncate">
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-sse-yellow/15 text-sse-yellow border border-sse-yellow/30">
                GIR {selectedDirection.code}
              </span>
              <h2 className="text-base lg:text-lg font-bold text-white truncate mt-1">
                {selectedDirection.destination}
              </h2>
              <p className="text-[11px] text-zinc-300 truncate">
                {selectedDirection.status}
              </p>
            </div>
          </div>

          {/* SÉLECTEUR DU POINT D'INSERTION (HAUT-LE-PIED) */}
          <div className="bg-sse-panel border border-white/10 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-1.5">
              <MapPin size={15} color="#DAE44E" className="shrink-0" />
              <span className="text-sm font-semibold text-zinc-300">
                Haut-le-Pied
              </span>
            </div>

            <select
              value={selectedSpawnStop}
              onChange={(e) => {
                setSelectedSpawnStop(e.target.value);
                setDepartureTime('');
                setCurrentStopIndex(0);
              }}
              className="w-full bg-sse-raised border border-white/10 text-white text-xs font-semibold rounded-lg p-3.5 focus:outline-none focus:border-sse-yellow transition-all"
            >
              <option value={activeSheet?.fullOrigin} className="bg-sse-panel">
                Terminus de départ : {activeSheet?.fullOrigin}
              </option>
              {lineSpawnStops.filter(s => s !== activeSheet?.fullOrigin).map(stop => (
                <option key={stop} value={stop} className="bg-sse-panel">
                  {stop}
                </option>
              ))}
            </select>

            {selectedSpawnStop && selectedSpawnStop !== activeSheet?.fullOrigin && (
              <div className="text-[11px] text-sse-yellow bg-sse-yellow/10 p-3 rounded-md border border-sse-yellow/20 flex items-center space-x-1.5">
                <ArrowRightDown size={14} color="#DAE44E" className="shrink-0" />
                <span>Prise de service à <strong>{selectedSpawnStop}</strong>. Les horaires sont calés sur le passage à cet arrêt.</span>
              </div>
            )}
          </div>

          {/* CARTE HIGHLIGHT : PROCHAIN DÉPART RECOMMANDÉ */}
          {nextScheduledTrip && (
            <div className="bg-sse-panel border border-sse-yellow/30 rounded-xl p-6 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold text-sse-night bg-sse-yellow px-2.5 py-0.5 rounded-full font-bold">
                    Prochain départ
                  </span>
                  {nextScheduledTrip.isLimitedService && (
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40">
                      Service partiel
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-300 font-medium font-mono">
                  {availableTrips.length} départs
                </span>
              </div>

              <div className="my-3 flex items-baseline space-x-3">
                <span className="text-5xl font-mono font-bold tracking-tight text-white">
                  {nextScheduledTrip.effectiveDepartureTime}
                </span>
                <span className="text-xs text-zinc-300 font-medium">
                  (Arrivée {nextScheduledTrip.arrivalTime})
                </span>
              </div>

              <div className="text-xs text-zinc-300 mb-5 space-y-1">
                <div>Durée : <strong className="text-white">{nextScheduledTrip.effectiveDurationMinutes} min</strong> • {nextScheduledTrip.effectiveStopCount} arrêts</div>
                <div>Origine : <strong className="text-white">{nextScheduledTrip.effectiveOriginStop}</strong></div>
              </div>

              <button
                onClick={() => {
                  setDepartureTime(nextScheduledTrip.effectiveDepartureTime);
                  setCurrentStopIndex(0);
                  setDelayMinutes(0);
                  setStep('service');
                }}
                className="w-full bg-sse-yellow hover:bg-sse-yellow-hi active:scale-[0.98] text-sse-night font-bold text-sm py-4 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all"
              >
                <span>Prendre le service de {nextScheduledTrip.effectiveDepartureTime}</span>
                <ArrowRight size={16} className="shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Colonne Droite : Grille de tous les départs disponibles */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="bg-sse-panel border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-3.5">
              <div>
                <h3 className="text-sm font-semibold text-zinc-300">
                  Tous les départs
                </h3>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Touchez un horaire pour prendre le service
                </p>
              </div>

              {/* Filtre complet vs partiel */}
              <div className="flex items-center bg-white/5 p-1 rounded-md text-[11px] font-bold font-mono self-start sm:self-auto">
                <button
                  onClick={() => setServiceFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'all' ? 'bg-sse-yellow text-sse-night' : 'text-zinc-400 hover:text-white'}`}
                >
                  Tous ({availableTrips.length})
                </button>
                <button
                  onClick={() => setServiceFilter('full')}
                  className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'full' ? 'bg-sse-yellow text-sse-night' : 'text-zinc-400 hover:text-white'}`}
                >
                  Complets
                </button>
                <button
                  onClick={() => setServiceFilter('limited')}
                  className={`px-3 py-1 rounded-lg transition-colors ${serviceFilter === 'limited' ? 'bg-sse-yellow text-sse-night' : 'text-zinc-400 hover:text-white'}`}
                >
                  Limités
                </button>
              </div>
            </div>

            {/* Grille des départs responsive */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2.5 max-h-[540px] overflow-y-auto pr-1 pt-1">
              {filteredTrips.map(trip => {
                const isSelected = trip.effectiveDepartureTime === departureTime;
                return (
                  <button
                    key={trip.tripId}
                    onClick={() => {
                      setDepartureTime(trip.effectiveDepartureTime);
                      setCurrentStopIndex(0);
                      setDelayMinutes(0);
                      setStep('service');
                    }}
                    className={`p-3 rounded-lg text-center border transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-sse-yellow text-sse-night border-sse-yellow font-bold' : 'bg-white/[0.04] hover:bg-white/[0.08] hover:border-sse-yellow/30 border-white/5 text-white'
                    }`}
                  >
                    <div className="font-mono text-base font-bold leading-tight">
                      {trip.effectiveDepartureTime}
                    </div>
                    <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-sse-night' : 'text-zinc-400'}`}>
                      arr. {trip.arrivalTime}
                    </div>
                    {trip.isLimitedService && (
                      <span className={`text-[8px] font-mono px-1 rounded block mt-0.5 truncate ${
                        isSelected ? 'bg-black/20 text-sse-night' : 'bg-amber-400/20 text-amber-300'
                      }`}>
                        Partiel
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
