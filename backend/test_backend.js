import { DataStore } from './src/services/dataStore.js';
import { FallbackRulesEngine } from './src/services/fallbackRules.js';

async function test() {
  console.log('--- Initializing DataStore ---');
  await DataStore.initialize();

  const hospitals = await DataStore.getHospitals();
  console.log(`Loaded ${hospitals.length} hospitals.`);

  const ambulances = await DataStore.getAmbulances();
  console.log(`Loaded ${ambulances.length} ambulances.`);

  const incidents = await DataStore.getIncidents();
  console.log(`Loaded ${incidents.length} incidents.`);

  console.log('--- Testing Fallback Rules Engine ---');
  const triage = FallbackRulesEngine.classifyTriage({
    chiefComplaint: 'Patient collapsed, unconscious and not breathing',
    conscious: false,
    breathing: false,
  });
  console.log('Triage ESI Level:', triage.esi_level, triage.category_name);

  const alloc = FallbackRulesEngine.allocateAmbulance(
    triage,
    { latitude: 12.9716, longitude: 77.5946 },
    ambulances
  );
  console.log('Allocated Ambulance:', alloc.selected_ambulance.call_sign, 'Score:', alloc.selected_ambulance.composite_score);

  const hosp = FallbackRulesEngine.recommendHospital(
    triage,
    { latitude: 12.9716, longitude: 77.5946 },
    hospitals
  );
  console.log('Recommended Hospital:', hosp.recommended_hospital.name, 'Score:', hosp.recommended_hospital.composite_score);

  console.log('--- Backend Verification Complete: ALL SYSTEMS GO ---');
  process.exit(0);
}

test().catch(err => {
  console.error('Backend test failed:', err);
  process.exit(1);
});
