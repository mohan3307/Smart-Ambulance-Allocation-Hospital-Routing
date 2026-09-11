import { DataStore } from '../services/dataStore.js';
import { AIClientService } from '../services/aiClient.js';
import { RoutingSimulator } from '../services/routingSimulator.js';
import { broadcastEvent } from '../services/socketManager.js';
import { SMSService } from '../services/smsService.js';

export const getIncidents = async (req, res) => {
  try {
    const incidents = await DataStore.getIncidents();
    res.json({ success: true, data: incidents });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getIncidentById = async (req, res) => {
  try {
    const incident = await DataStore.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const createEmergencyIncident = async (req, res) => {
  try {
    const {
      callerName,
      callerPhone,
      source = 'Bystander_SOS',
      location,
      chiefComplaint,
      symptoms = [],
      conscious = true,
      breathing = true,
      severeBleeding = false,
      casualtyCount = 1,
      sceneHazards = [],
      vitals,
      patientAge,
      gender,
    } = req.body;

    if (!location || !location.latitude || !location.longitude) {
      return res.status(400).json({ success: false, error: 'Valid GPS latitude and longitude are required' });
    }

    const incidentCode = `INC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Fetch live ambulances and hospitals
    const allAmbulances = await DataStore.getAmbulances();
    const allHospitals = await DataStore.getHospitals();

    const incLon = location.longitude ?? location.coordinates?.[0] ?? 77.5946;
    const incLat = location.latitude ?? location.coordinates?.[1] ?? 12.9716;

    // Use MongoDB 2dsphere $geoNear geospatial aggregation (with in-memory spatial fallback)
    let candidateAmbulances = await DataStore.findNearestAmbulances(incLon, incLat, 35000, { status: 'Available' });
    if (candidateAmbulances.length === 0) {
      candidateAmbulances = await DataStore.findNearestAmbulances(incLon, incLat, 35000);
    }
    if (candidateAmbulances.length === 0) {
      const all = await DataStore.getAmbulances();
      candidateAmbulances = all.slice(0, 4);
    }

    let candidateHospitals = await DataStore.findNearestHospitals(incLon, incLat, 45000, { diversionStatus: false });
    if (candidateHospitals.length === 0) {
      candidateHospitals = await DataStore.findNearestHospitals(incLon, incLat, 45000);
    }
    if (candidateHospitals.length === 0) {
      const allH = await DataStore.getHospitals();
      candidateHospitals = allH.slice(0, 5);
    }

    // Call AI Optimization Pipeline (with automatic fallback to Manchester Triage / ESI rules engine)
    const optimizationResult = await AIClientService.performFullOptimization(
      {
        incidentCode,
        chiefComplaint,
        symptoms,
        conscious,
        breathing,
        severeBleeding,
        patientAge,
        gender,
        vitals,
      },
      location,
      candidateAmbulances,
      candidateHospitals
    );

    const { triage, ambulance_allocation, hospital_recommendation, xai_explanation, system_engine } =
      optimizationResult;

    const selectedAmb = ambulance_allocation.selected_ambulance;
    const selectedHosp = hospital_recommendation.recommended_hospital;

    // Generate Route Waypoints from Ambulance -> Incident Location -> Hospital
    const fullAmbulanceObj = allAmbulances.find(
      (a) => (a.id || a._id).toString() === selectedAmb.id.toString()
    );
    const ambStartLat = fullAmbulanceObj?.location?.latitude || location.latitude + 0.02;
    const ambStartLon = fullAmbulanceObj?.location?.longitude || location.longitude - 0.02;

    const routeToSceneRes = await RoutingSimulator.getRealRoadRoute(
      ambStartLat,
      ambStartLon,
      location.latitude,
      location.longitude
    );

    const routeToHospRes = await RoutingSimulator.getRealRoadRoute(
      location.latitude,
      location.longitude,
      selectedHosp.latitude || 12.9716,
      selectedHosp.longitude || 77.5946
    );

    const fullActiveRoute = [...routeToSceneRes.coordinates, ...routeToHospRes.coordinates.slice(1)];
    const totalDistanceKm = Math.round((routeToSceneRes.distanceKm + routeToHospRes.distanceKm) * 10) / 10;
    const totalDurationMinutes = Math.round((routeToSceneRes.durationMinutes + routeToHospRes.durationMinutes) * 10) / 10;

    // Construct new Incident
    const incidentData = {
      incidentCode,
      callerName: callerName || 'Bystander SOS',
      callerPhone: callerPhone || '+91-Emergency',
      source,
      location,
      chiefComplaint,
      symptoms,
      conscious,
      breathing,
      severeBleeding,
      casualtyCount: parseInt(casualtyCount) || 1,
      sceneHazards,
      vitals,
      triage: {
        esiLevel: triage.esi_level,
        triageColor: triage.triage_color,
        categoryName: triage.category_name,
        severityScore: triage.severity_score,
        recommendedSpecialties: triage.recommended_specialties,
        requiredEquipment: triage.required_equipment,
        minParamedicSkill: triage.min_paramedic_skill,
        firstAidGuidanceKey: triage.first_aid_guidance_key,
        clinicalFlags: triage.clinical_flags,
        explanation: triage.explanation,
        triageTimestamp: new Date(),
        engine: system_engine,
      },
      assignedAmbulance: {
        ambulanceId: selectedAmb.id,
        callSign: selectedAmb.call_sign,
        dispatchedAt: new Date(),
        estimatedArrivalMinutes: selectedAmb.eta_minutes,
        allocationScore: selectedAmb.composite_score,
        allocationRationale: selectedAmb.selection_rationale,
      },
      targetHospital: {
        hospitalId: selectedHosp.id,
        name: selectedHosp.name,
        bedReserved: true,
        estimatedArrivalMinutes: selectedHosp.eta_minutes,
        recommendationScore: selectedHosp.composite_score,
        recommendationRationale: selectedHosp.selection_rationale,
      },
      status: 'Dispatched',
      timeline: [
        { status: 'Reported', timestamp: new Date(), notes: `Emergency reported via ${source}` },
        { status: 'Triaged', timestamp: new Date(), notes: `Classified as ESI ${triage.esi_level} (${triage.category_name})` },
        { status: 'Dispatched', timestamp: new Date(), notes: `Dispatched ${selectedAmb.call_sign} to scene` },
      ],
    };

    const savedIncident = await DataStore.createIncident(incidentData);

    // Update Ambulance state
    await DataStore.updateAmbulance(selectedAmb.id, {
      status: 'En_Route_Scene',
      currentIncidentId: savedIncident.incidentCode,
      targetHospitalId: selectedHosp.id,
      activeRoute: fullActiveRoute,
      routeProgressIndex: 0,
      trafficDelayFactor: 1.0,
    });

    // Save XAI Audit Log
    await DataStore.createAuditLog({
      decisionType: 'Ambulance_Allocation',
      incidentId: savedIncident.incidentCode,
      engineUsed: system_engine,
      inputParameters: {
        chiefComplaint,
        symptoms,
        vitals,
        triageLevel: triage.esi_level,
      },
      selectedOutcome: {
        ambulance: selectedAmb.call_sign,
        ambulanceScore: selectedAmb.composite_score,
        hospital: selectedHosp.name,
        hospitalScore: selectedHosp.composite_score,
      },
      alternativeOptions: ambulance_allocation.ranked_candidates.slice(1, 4),
      rationaleText: ambulance_allocation.explanation,
      goldenHourMinutesSaved: xai_explanation?.estimated_golden_hour_minutes_saved || 15.0,
      xaiMetrics: xai_explanation,
    });

    // Real-time broadcast
    broadcastEvent('incident:created', savedIncident);

    // Send SMS alerts to Hospital and Caller
    SMSService.notifyHospitalDispatch({
      hospitalName: selectedHosp.name,
      hospitalPhone: selectedHosp.contactPhone,
      incidentCode: savedIncident.incidentCode,
      esiLevel: triage.esi_level,
      chiefComplaint,
      ambCallSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
    }).catch(console.warn);

    SMSService.notifyCallerDispatch({
      callerPhone,
      incidentCode: savedIncident.incidentCode,
      ambCallSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
    }).catch(console.warn);

    broadcastEvent('ambulance:dispatched', {
      incidentId: savedIncident.incidentCode,
      ambulanceId: selectedAmb.id,
      callSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
      route: fullActiveRoute,
    });
    broadcastEvent('hospital:incoming_patient', {
      hospitalId: selectedHosp.id,
      incidentCode: savedIncident.incidentCode,
      triage: savedIncident.triage,
      ambulanceCallSign: selectedAmb.call_sign,
      etaMinutes: selectedHosp.eta_minutes,
    });

    res.status(201).json({
      success: true,
      data: savedIncident,
      allocationDetails: ambulance_allocation,
      hospitalDetails: hospital_recommendation,
      xaiExplanation: xai_explanation,
      systemEngine: system_engine,
    });
  } catch (err) {
    console.error('Error creating emergency incident:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateIncidentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const incident = await DataStore.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const timeline = incident.timeline || [];
    timeline.push({ status, timestamp: new Date(), notes: notes || `Status transitioned to ${status}` });

    const updated = await DataStore.updateIncident(id, {
      status,
      timeline,
    });

    if (status === 'Resolved' && incident.assignedAmbulance?.ambulanceId) {
      await DataStore.updateAmbulance(incident.assignedAmbulance.ambulanceId, {
        status: 'Available',
        currentIncidentId: null,
        targetHospitalId: null,
        activeRoute: [],
        routeProgressIndex: 0,
      });
    }

    broadcastEvent('incident:status_changed', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const toggleGreenCorridor = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await DataStore.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const newStatus = !incident.greenCorridorActive;
    const updated = await DataStore.updateIncident(id, { greenCorridorActive: newStatus });

    if (incident.assignedAmbulance?.ambulanceId) {
      await DataStore.updateAmbulance(incident.assignedAmbulance.ambulanceId, {
        trafficDelayFactor: newStatus ? 0.75 : 1.0, // 25% speed enhancement through green corridor
      });
    }

    broadcastEvent('green_corridor:toggled', {
      incidentId: incident.incidentCode,
      active: newStatus,
      ambulanceCallSign: incident.assignedAmbulance?.callSign,
      message: newStatus
        ? `Green Corridor ACTIVATED for ${incident.assignedAmbulance?.callSign}! Traffic signals preempted.`
        : `Green Corridor DEACTIVATED. Normal traffic restored.`,
    });

    res.json({ success: true, data: updated, greenCorridorActive: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const autoDispatchIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const incident = await DataStore.getIncidentById(id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    const allAmbulances = await DataStore.getAmbulances();
    const allHospitals = await DataStore.getHospitals();

    const incLon = incident.location?.longitude ?? incident.location?.coordinates?.[0] ?? 77.5946;
    const incLat = incident.location?.latitude ?? incident.location?.coordinates?.[1] ?? 12.9716;

    // Use MongoDB 2dsphere $geoNear geospatial aggregation (with in-memory spatial fallback)
    let candidateAmbulances = await DataStore.findNearestAmbulances(incLon, incLat, 35000, { status: 'Available' });
    if (candidateAmbulances.length === 0) {
      candidateAmbulances = await DataStore.findNearestAmbulances(incLon, incLat, 35000);
    }
    if (candidateAmbulances.length === 0) {
      candidateAmbulances = allAmbulances.slice(0, 4);
    }

    let candidateHospitals = await DataStore.findNearestHospitals(incLon, incLat, 45000, { diversionStatus: false });
    if (candidateHospitals.length === 0) {
      candidateHospitals = await DataStore.findNearestHospitals(incLon, incLat, 45000);
    }
    if (candidateHospitals.length === 0) {
      candidateHospitals = allHospitals.slice(0, 5);
    }

    const opt = await AIClientService.performFullOptimization(
      {
        incidentCode: incident.incidentCode,
        chiefComplaint: incident.chiefComplaint,
        symptoms: incident.symptoms || [],
        conscious: incident.conscious ?? true,
        breathing: incident.breathing ?? true,
        severeBleeding: incident.severeBleeding ?? false,
        vitals: incident.vitals,
      },
      incident.location,
      candidateAmbulances,
      candidateHospitals
    );

    const selectedAmb = opt.ambulance_allocation.selected_ambulance;
    const selectedHosp = opt.hospital_recommendation.recommended_hospital;

    const ambObj = allAmbulances.find((a) => (a.id || a._id).toString() === selectedAmb.id.toString());
    const ambStartLat = ambObj?.location?.latitude || incident.location.latitude + 0.015;
    const ambStartLon = ambObj?.location?.longitude || incident.location.longitude - 0.015;

    const routeToSceneRes = await RoutingSimulator.getRealRoadRoute(
      ambStartLat,
      ambStartLon,
      incident.location.latitude,
      incident.location.longitude
    );
    const routeToHospRes = await RoutingSimulator.getRealRoadRoute(
      incident.location.latitude,
      incident.location.longitude,
      selectedHosp.latitude || 12.9716,
      selectedHosp.longitude || 77.5946
    );
    const fullActiveRoute = [...routeToSceneRes.coordinates, ...routeToHospRes.coordinates.slice(1)];
    const totalDistanceKm = Math.round((routeToSceneRes.distanceKm + routeToHospRes.distanceKm) * 10) / 10;

    const updated = await DataStore.updateIncident(id, {
      status: 'Dispatched',
      assignedAmbulance: {
        ambulanceId: selectedAmb.id,
        callSign: selectedAmb.call_sign,
        dispatchedAt: new Date(),
        estimatedArrivalMinutes: selectedAmb.eta_minutes,
        allocationScore: selectedAmb.composite_score,
        allocationRationale: selectedAmb.selection_rationale,
      },
      targetHospital: {
        hospitalId: selectedHosp.id,
        name: selectedHosp.name,
        bedReserved: true,
        estimatedArrivalMinutes: selectedHosp.eta_minutes,
        recommendationScore: selectedHosp.composite_score,
        recommendationRationale: selectedHosp.selection_rationale,
      },
    });

    await DataStore.updateAmbulance(selectedAmb.id, {
      status: 'En_Route_Scene',
      currentIncidentId: incident.incidentCode,
      targetHospitalId: selectedHosp.id,
      activeRoute: fullActiveRoute,
      routeProgressIndex: 0,
      trafficDelayFactor: 1.0,
    });

    broadcastEvent('incident:created', updated);
    broadcastEvent('ambulance:dispatched', {
      incidentId: incident.incidentCode,
      ambulanceId: selectedAmb.id,
      callSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
      route: fullActiveRoute,
    });

    // Outbound alerts to hospital and caller
    SMSService.notifyHospitalDispatch({
      hospitalName: selectedHosp.name,
      hospitalPhone: selectedHosp.contactPhone,
      incidentCode: incident.incidentCode,
      esiLevel: incident.triage?.esiLevel || 2,
      chiefComplaint: incident.chiefComplaint,
      ambCallSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
    }).catch(console.warn);

    SMSService.notifyCallerDispatch({
      callerPhone: incident.callerPhone,
      incidentCode: incident.incidentCode,
      ambCallSign: selectedAmb.call_sign,
      etaMinutes: selectedAmb.eta_minutes,
    }).catch(console.warn);

    res.json({ success: true, data: updated, ambulance: selectedAmb, hospital: selectedHosp });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

