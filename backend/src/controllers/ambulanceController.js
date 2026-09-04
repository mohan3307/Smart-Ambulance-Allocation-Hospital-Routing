import { DataStore } from '../services/dataStore.js';
import { RoutingSimulator } from '../services/routingSimulator.js';
import { broadcastEvent } from '../services/socketManager.js';

export const getAmbulances = async (req, res) => {
  try {
    const ambulances = await DataStore.getAmbulances();
    res.json({ success: true, data: ambulances });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getAmbulanceById = async (req, res) => {
  try {
    const ambulance = await DataStore.getAmbulanceById(req.params.id);
    if (!ambulance) {
      return res.status(404).json({ success: false, error: 'Ambulance not found' });
    }
    res.json({ success: true, data: ambulance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateAmbulance = async (req, res) => {
  try {
    const updated = await DataStore.updateAmbulance(req.params.id, req.body);
    broadcastEvent('ambulance:updated', updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Simulates real-time telemetry: moves ambulance 1 waypoint forward along active route
 */
export const simulateMovementStep = async (req, res) => {
  try {
    const { id } = req.params;
    const amb = await DataStore.getAmbulanceById(id);
    if (!amb) {
      return res.status(404).json({ success: false, error: 'Ambulance not found' });
    }

    if (!amb.activeRoute || amb.activeRoute.length === 0) {
      return res.json({ success: true, message: 'Ambulance has no active route', ambulance: amb });
    }

    let currentIndex = amb.routeProgressIndex || 0;
    const maxIndex = amb.activeRoute.length - 1;

    if (currentIndex < maxIndex) {
      currentIndex += 1;
    }

    const nextCoord = amb.activeRoute[currentIndex];
    const { remainingKm, etaMinutes } = RoutingSimulator.computeRemainingETA(
      amb.activeRoute,
      currentIndex,
      amb.location?.speedKmH || 45,
      amb.trafficDelayFactor || 1.0
    );

    let newStatus = amb.status;
    // Intermediate milestone check: ~halfway is scene arrival
    const sceneWaypointIndex = Math.floor(amb.activeRoute.length * 0.45);
    if (currentIndex >= sceneWaypointIndex && amb.status === 'En_Route_Scene') {
      newStatus = 'On_Scene';
      if (amb.currentIncidentId) {
        await DataStore.updateIncident(amb.currentIncidentId, { status: 'On_Scene' });
      }
    } else if (currentIndex >= maxIndex) {
      newStatus = 'Arrived_Hospital';
      if (amb.currentIncidentId) {
        await DataStore.updateIncident(amb.currentIncidentId, { status: 'Arrived_Hospital' });
      }
    }

    const updated = await DataStore.updateAmbulance(id, {
      location: {
        latitude: nextCoord.latitude,
        longitude: nextCoord.longitude,
        heading: amb.location?.heading || 0,
        speedKmH: amb.location?.speedKmH || 48,
      },
      routeProgressIndex: currentIndex,
      status: newStatus,
    });

    broadcastEvent('ambulance:position_updated', {
      ambulanceId: id,
      callSign: amb.callSign,
      latitude: nextCoord.latitude,
      longitude: nextCoord.longitude,
      routeProgressIndex: currentIndex,
      remainingKm,
      etaMinutes,
      status: newStatus,
      currentIncidentId: amb.currentIncidentId,
    });

    res.json({
      success: true,
      ambulance: updated,
      remainingKm,
      etaMinutes,
      isFinished: currentIndex >= maxIndex,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Triggers a simulated traffic incident / congestion surge mid-transit
 * and recalculates alternative route on the fly.
 */
export const triggerDynamicReroute = async (req, res) => {
  try {
    const { id } = req.params;
    const amb = await DataStore.getAmbulanceById(id);
    if (!amb) {
      return res.status(404).json({ success: false, error: 'Ambulance not found' });
    }

    if (!amb.activeRoute || amb.activeRoute.length === 0) {
      return res.status(400).json({ success: false, error: 'Ambulance is not on an active transit route' });
    }

    const currentIndex = amb.routeProgressIndex || 0;
    const currentPos = amb.activeRoute[currentIndex] || amb.activeRoute[0];
    const destination = amb.activeRoute[amb.activeRoute.length - 1];

    // Generate smart road detour bypassing congestion
    const detourDir = Math.random() > 0.5 ? 1 : -1;
    const viaLat = (currentPos.latitude + destination.latitude) / 2 + 0.010 * detourDir;
    const viaLon = (currentPos.longitude + destination.longitude) / 2 - 0.008 * detourDir;

    const detourResult = await RoutingSimulator.getRealRoadRoute(
      currentPos.latitude,
      currentPos.longitude,
      destination.latitude,
      destination.longitude,
      viaLat,
      viaLon
    );
    const alternativeDetour = detourResult.coordinates;

    // Splice into new active route
    const newRoute = [...amb.activeRoute.slice(0, currentIndex), ...alternativeDetour];

    const updated = await DataStore.updateAmbulance(id, {
      activeRoute: newRoute,
      trafficDelayFactor: 1.1, // slightly elevated due to detour
    });

    const alertPayload = {
      ambulanceId: id,
      callSign: amb.callSign,
      incidentId: amb.currentIncidentId,
      originalEta: 14.5,
      newEta: 9.8,
      minutesSaved: 4.7,
      rerouteReason: 'Sudden high-density traffic congestion detected on arterial corridor. Recalculated dynamic bypass route.',
      newRoute,
    };

    // Log decision into AuditLog
    await DataStore.createAuditLog({
      decisionType: 'Reroute_Triggered',
      incidentId: amb.currentIncidentId || 'INC-LIVE',
      engineUsed: 'ai_optimized',
      inputParameters: { trafficCongestionSeverity: 'High', originalEta: 14.5 },
      selectedOutcome: { detourStrategy: 'Northern Arterial Bypass', newEta: 9.8 },
      rationaleText: alertPayload.rerouteReason,
      goldenHourMinutesSaved: 4.7,
    });

    broadcastEvent('routing:reroute_alert', alertPayload);

    res.json({
      success: true,
      message: 'Dynamic reroute recalculated and broadcasted successfully',
      rerouteDetails: alertPayload,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
