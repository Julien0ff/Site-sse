import React from 'react';
import { textOnLineColor } from '../../utils/lineColors.js';
import DriveTab from './DriveTab.jsx';
import StopsTab from './StopsTab.jsx';
import TimetableTab from './TimetableTab.jsx';
import GirouetteTab from './GirouetteTab.jsx';

// Étape 3 : pupitre de bord (girouette, onglets)
export default function ServiceConsole({ svc, busData, handleFinishService, activeRoster, handleLaunchServiceFromRoster, changeAppMode, setIsProfileOpen }) {
  const {
    setStep,
    selectedDirection,
    departureTime,
    serviceTab,
    setServiceTab,
    serviceCompleted,
    selectedTrip,
    isInService,
    activeLine,
  } = svc;

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-slide-up">
      
      {/* GIROUETTE : ce que les voyageurs lisent sur le bus */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
        <div className="girouette flex items-stretch flex-1 min-w-0" aria-label={`Girouette : ${activeLine.name} ${selectedTrip?.destinationStop || selectedDirection.destination}`}>
          <span
            className="girouette-code flex items-center px-3 sm:px-4 text-2xl sm:text-3xl shrink-0"
            style={{ backgroundColor: activeLine.color || '#F3C318', color: activeLine.textColor || textOnLineColor(activeLine.color || '#F3C318') }}
          >
            {activeLine.name}
          </span>
          <span className="flex items-center px-3 sm:px-4 py-2.5 text-xl sm:text-3xl truncate">
            {selectedTrip?.destinationStop || selectedDirection.destination}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-sm">
          <dl className="flex gap-4">
            <div>
              <dt className="text-xs text-zinc-400">Code pupitre</dt>
              <dd className="font-mono font-semibold text-white">{selectedDirection.code}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-400">Départ</dt>
              <dd className="font-mono font-semibold text-white">
                {departureTime}
                {selectedTrip?.isLimitedService && <span className="ml-1.5 text-amber-300 font-sans font-medium">partiel</span>}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => {
              if (isInService && !serviceCompleted && !window.confirm('Abandonner ce service en cours ?')) return;
              setStep('select-line');
            }}
            className="px-3 py-2 rounded-md text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Changer de ligne
          </button>
        </div>
      </div>

      {/* Onglets du pupitre */}
      <div className="flex gap-1 border-b border-sse-line overflow-x-auto no-scrollbar" role="tablist">
        {[
          { id: 'conduite', label: 'Conduite' },
          { id: 'arrets', label: 'Arrêts' },
          { id: 'grille', label: 'Grille horaire' },
          { id: 'speciaux', label: 'Codes girouette' }
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={serviceTab === tab.id}
            onClick={() => setServiceTab(tab.id)}
            className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors ${
              serviceTab === tab.id
                ? 'border-sse-yellow text-white' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {serviceTab === 'conduite' && (
        <DriveTab
          svc={svc}
          handleFinishService={handleFinishService}
          activeRoster={activeRoster}
          handleLaunchServiceFromRoster={handleLaunchServiceFromRoster}
          changeAppMode={changeAppMode}
          setIsProfileOpen={setIsProfileOpen}
        />
      )}
      {serviceTab === 'arrets' && <StopsTab svc={svc} />}
      {serviceTab === 'grille' && <TimetableTab svc={svc} />}
      {serviceTab === 'speciaux' && <GirouetteTab svc={svc} busData={busData} />}
    </main>
  );
}
