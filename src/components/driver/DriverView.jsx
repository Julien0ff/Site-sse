import React, { useEffect } from 'react';
import LinePicker from './LinePicker.jsx';
import TimePicker from './TimePicker.jsx';
import ServiceConsole from './ServiceConsole.jsx';

// Espace conducteur : ligne -> horaire -> pupitre
export default function DriverView({
  busData,
  svc,
  activeRoster,
  user,
  onRecordService,
  onLaunchService,
  onOpenRoster,
  onOpenProfile
}) {
  const {
    step, patch, session,
    selectedDirection, selectedTrip, departureTime, delayMinutes,
    activeTripStops, activeLine
  } = svc;

  // Session restaurée sur une ligne qui n'existe plus : on repart du choix de ligne
  useEffect(() => {
    if (step !== 'select-line' && !activeLine) patch({ step: 'select-line' });
  }, [step, activeLine]);

  const handleFinishService = () => {
    const servicePayload = {
      lineName: activeLine?.name || 'Ligne',
      lineId: activeLine?.lineId,
      logoUrl: activeLine?.logoUrl,
      code: selectedDirection?.code,
      directionCode: selectedDirection?.code,
      origin: selectedTrip?.effectiveOriginStop || selectedDirection?.origin,
      destination: selectedTrip?.destinationStop || selectedDirection?.destination,
      departureTime: selectedTrip?.effectiveDepartureTime || departureTime,
      arrivalTime: selectedTrip?.arrivalTime || '',
      durationMinutes: selectedTrip?.effectiveDurationMinutes || 20,
      delayMinutes,
      stopCount: activeTripStops?.length || 0,
      stopsCount: activeTripStops?.length || 0,
      driverId: user?.id || 'guest',
      driverName: user?.username || 'Conducteur',
      date: new Date().toLocaleDateString('fr-FR')
    };

    const checkedStep = onRecordService(servicePayload, {
      dirId: selectedDirection?.dirId,
      rosterStep: session.rosterStep
    });
    patch({ completed: true, lastAutoChecked: checkedStep });
  };

  if (!activeLine) return null;

  if (step === 'select-time') return <TimePicker svc={svc} />;

  if (step === 'service') {
    return (
      <ServiceConsole
        svc={svc}
        busData={busData}
        handleFinishService={handleFinishService}
        activeRoster={activeRoster}
        handleLaunchServiceFromRoster={onLaunchService}
        changeAppMode={(mode) => mode === 'roulement' && onOpenRoster()}
        setIsProfileOpen={(open) => open && onOpenProfile()}
      />
    );
  }

  return <LinePicker svc={svc} busData={busData} />;
}
