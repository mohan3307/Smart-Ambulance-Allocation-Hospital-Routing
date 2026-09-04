import express from 'express';
import {
  getIncidents,
  getIncidentById,
  createEmergencyIncident,
  updateIncidentStatus,
  toggleGreenCorridor,
  autoDispatchIncident,
} from '../controllers/incidentController.js';
import {
  getAmbulances,
  getAmbulanceById,
  updateAmbulance,
  simulateMovementStep,
  triggerDynamicReroute,
} from '../controllers/ambulanceController.js';
import {
  getHospitals,
  getHospitalById,
  updateHospitalBeds,
  prepareEmergencyBay,
} from '../controllers/hospitalController.js';
import {
  getHealthAndStats,
  getAuditLogs,
  resetSystemData,
} from '../controllers/systemController.js';

const router = express.Router();

// Incidents
router.get('/incidents', getIncidents);
router.get('/incidents/:id', getIncidentById);
router.post('/incidents', createEmergencyIncident);
router.patch('/incidents/:id/status', updateIncidentStatus);
router.post('/incidents/:id/green-corridor', toggleGreenCorridor);
router.post('/incidents/:id/auto-dispatch', autoDispatchIncident);

// Ambulances
router.get('/ambulances', getAmbulances);
router.get('/ambulances/:id', getAmbulanceById);
router.patch('/ambulances/:id', updateAmbulance);
router.post('/ambulances/:id/step', simulateMovementStep);
router.post('/ambulances/:id/traffic-spike', triggerDynamicReroute);

// Hospitals
router.get('/hospitals', getHospitals);
router.get('/hospitals/:id', getHospitalById);
router.patch('/hospitals/:id/beds', updateHospitalBeds);
router.post('/hospitals/:id/prepare-bay', prepareEmergencyBay);

// System & Analytics
router.get('/system/health-stats', getHealthAndStats);
router.get('/system/audits', getAuditLogs);
router.post('/system/reset', resetSystemData);

export default router;
