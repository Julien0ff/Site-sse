import { useEffect, useState } from 'react';
import { expandBusData } from './busDataCodec.js';

// Les fiches horaires (le plus gros du site) sont chargées à part, après
// l'affichage de la page, au lieu d'être dans le bundle principal.
let pending = null;

export function loadBusData() {
  if (!pending) {
    pending = import('virtual:bus-data')
      .then(mod => expandBusData(mod.default))
      .catch(err => {
        pending = null; // permettre un nouvel essai
        throw err;
      });
  }
  return pending;
}

export function useBusData() {
  const [state, setState] = useState({ data: null, error: null });

  const load = () => {
    setState({ data: null, error: null });
    loadBusData()
      .then(data => setState({ data, error: null }))
      .catch(error => setState({ data: null, error }));
  };

  useEffect(load, []);

  return { busData: state.data, error: state.error, retry: load };
}
