import React, { useMemo } from 'react';
import { Bus, User, List, ChevronRight } from '@getpapillon/papicons';

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Prochain départ de chaque direction du réseau, triés par heure
function useNextDepartures(busData, effectiveClock, limit = 7) {
  const nowMin = effectiveClock.getHours() * 60 + effectiveClock.getMinutes();
  return useMemo(() => {
    const rows = [];
    for (const line of busData.lines) {
      for (const dir of line.directions) {
        const trips = busData.sheets?.[dir.sheetKey]?.trips || [];
        if (!trips.length) continue;
        // Après minuit on repart sur les premiers départs du lendemain
        let trip = trips.find(t => toMin(t.departureTime) >= nowMin);
        let wait;
        if (trip) {
          wait = toMin(trip.departureTime) - nowMin;
        } else {
          trip = trips[0];
          wait = toMin(trip.departureTime) + 1440 - nowMin;
        }
        rows.push({ line, dir, trip, wait });
      }
    }
    return rows.sort((a, b) => a.wait - b.wait).slice(0, limit);
    // recalcul une fois par minute suffit
  }, [busData, nowMin, limit]);
}

function formatWait(min) {
  if (min <= 0) return 'à quai';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;
}

function greeting(date) {
  const h = date.getHours();
  if (h < 5 || h >= 18) return 'Bonsoir';
  return 'Bonjour';
}

export default function WelcomeView({ busData, effectiveClock, onSelectMode, onLaunchService, activeRoster, user, onOpenProfile }) {
  const departures = useNextDepartures(busData, effectiveClock);
  const nextRosterStep = activeRoster?.steps?.find(s => !s.isCompleted);

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-slide-up">
      <div className="mb-6 sm:mb-8">
        <h1 className="font-sign text-3xl sm:text-4xl font-bold leading-tight text-white">
          {greeting(effectiveClock)}{user ? `, ${user.username}` : ''}.
        </h1>
        <p className="text-zinc-400 mt-1">
          {departures.length === 0
            ? 'Aucun départ prévu pour le moment.'
            : departures[0].wait <= 0
              ? 'Un bus part en ce moment sur le réseau.'
              : `Prochain départ sur le réseau dans ${formatWait(departures[0].wait)}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

        {/* Colonne actions : vient en premier sur mobile */}
        <div className="lg:col-span-5 lg:order-2 space-y-3">
          {activeRoster && (
            <div className="rounded-xl bg-sse-yellow text-sse-night p-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-bold">Feuille de route en cours</h2>
                <span className="font-mono font-semibold text-sm">
                  {activeRoster.completedSteps}/{activeRoster.totalSteps}
                </span>
              </div>
              <div className="h-1 rounded-full bg-sse-night/15 mt-2 overflow-hidden">
                <div
                  className="h-full bg-sse-night"
                  style={{ width: `${activeRoster.totalSteps ? (activeRoster.completedSteps / activeRoster.totalSteps) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm mt-2 text-sse-night/80">
                {nextRosterStep
                  ? `Prochaine course : ligne ${nextRosterStep.lineName} à ${nextRosterStep.departureTime}`
                  : 'Toutes les courses sont faites.'}
              </p>
              <div className="flex gap-2 mt-3">
                {nextRosterStep && (
                  <button
                    type="button"
                    onClick={() => onLaunchService({
                      lineName: nextRosterStep.lineName,
                      dirId: nextRosterStep.dirId,
                      departureTime: nextRosterStep.departureTime,
                      rosterStepNumber: nextRosterStep.stepNumber
                    })}
                    className="px-3.5 py-2 rounded-md bg-sse-night text-white text-sm font-semibold hover:bg-sse-deep"
                  >
                    Lancer la course {nextRosterStep.stepNumber}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectMode('roulement')}
                  className="px-3.5 py-2 rounded-md text-sm font-semibold hover:bg-sse-night/10"
                >
                  Voir la feuille
                </button>
              </div>
            </div>
          )}

          <nav className="rounded-xl border border-sse-line divide-y divide-sse-line overflow-hidden" aria-label="Espaces">
            {[
              { id: 'conducteur', icon: Bus, title: 'Prendre un service', text: 'Choisir une ligne, un horaire et conduire avec le pupitre.' },
              { id: 'roulement', icon: List, title: activeRoster ? 'Nouvelle feuille de route' : 'Générer une feuille de route', text: 'Une journée de courses enchaînées, avec relèves aux terminus.' },
              { id: 'passager', icon: User, title: 'Horaires voyageurs', text: 'Arrêts, correspondances et prochains passages.' }
            ].map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMode(item.id)}
                  className="w-full flex items-center gap-4 p-4 text-left bg-sse-panel hover:bg-sse-raised transition-colors"
                >
                  <Icon size={22} className="shrink-0 text-sse-yellow" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-white">{item.title}</span>
                    <span className="block text-sm text-zinc-400 mt-0.5">{item.text}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-zinc-500" />
                </button>
              );
            })}
          </nav>

          {!user && onOpenProfile && (
            <p className="text-sm text-zinc-400 px-1">
              <button type="button" onClick={onOpenProfile} className="text-white underline underline-offset-4 decoration-sse-line hover:decoration-white">
                Connectez Discord
              </button>{' '}
              pour retrouver vos services sur tous vos appareils.
            </p>
          )}
        </div>

        {/* Tableau des départs */}
        <section className="lg:col-span-7 lg:order-1" aria-labelledby="board-title">
          <div className="flex items-baseline justify-between mb-2">
            <h2 id="board-title" className="font-semibold text-white">Prochains départs</h2>
            <span className="text-sm text-zinc-400">Touchez pour prendre le service</span>
          </div>

          <ol className="rounded-xl overflow-hidden border border-sse-line divide-y divide-sse-line bg-sse-panel">
            {departures.map(({ line, dir, trip, wait }) => (
              <li key={dir.dirId}>
                <button
                  type="button"
                  onClick={() => onLaunchService({ lineName: line.name, dirId: dir.dirId, departureTime: trip.departureTime })}
                  className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 pl-0 pr-4 py-3 text-left hover:bg-sse-raised transition-colors"
                >
                  <img src={line.logoUrl} alt={`Ligne ${line.name}`} className="h-7 w-14 object-contain ml-4" />
                  <span className="min-w-0">
                    <span className="block font-sign font-bold text-lg leading-tight text-white truncate">
                      {trip.destinationStop || dir.destination}
                    </span>
                    <span className="block text-xs text-zinc-400 truncate">
                      depuis {trip.originStop}
                      {trip.isLimitedService && <span className="text-amber-300"> · service partiel</span>}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className={`block font-sign font-bold text-lg leading-tight ${wait <= 2 ? 'text-sse-yellow' : 'text-white'}`}>
                      {formatWait(wait)}
                    </span>
                    <span className="block font-mono text-xs text-zinc-400">{trip.departureTime}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
