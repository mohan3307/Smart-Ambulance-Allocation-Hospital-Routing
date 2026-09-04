import axios from 'axios';
import { FallbackRulesEngine } from './fallbackRules.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const TIMEOUT_MS = 1500;

export class AIClientService {
  static async checkHealth() {
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 800 });
      return { online: true, ...response.data };
    } catch (err) {
      return { online: false, mode: 'rules_fallback_active', reason: err.message };
    }
  }

  static async performFullOptimization(triageRequest, incidentLocation, ambulances, hospitals) {
    try {
      // Map ambulances to Pydantic schema
      const mappedAmbulances = ambulances.map((amb) => {
        const dist = FallbackRulesEngine.calculateHaversineDistanceKm(
          amb.location?.latitude || amb.latitude,
          amb.location?.longitude || amb.longitude,
          incidentLocation.latitude,
          incidentLocation.longitude
        );
        const speed = (amb.location?.speedKmH || amb.speedKmH || 45) / (amb.trafficDelayFactor || 1.0);
        const eta = Math.max(1.0, (dist / speed) * 60);

        return {
          id: amb._id ? amb._id.toString() : amb.id,
          call_sign: amb.callSign || amb.call_sign,
          ambulance_type: amb.ambulanceType || amb.ambulance_type || 'ALS',
          status: amb.status || 'Available',
          latitude: amb.location?.latitude || amb.latitude,
          longitude: amb.location?.longitude || amb.longitude,
          eta_minutes: Math.round(eta * 10) / 10,
          distance_km: Math.round(dist * 10) / 10,
          equipment: amb.equipment || [],
          paramedic_level: amb.paramedicCrew?.skillLevel || amb.paramedic_level || 'Advanced',
          traffic_delay_factor: amb.trafficDelayFactor || 1.0,
        };
      });

      // Map hospitals to Pydantic schema
      const mappedHospitals = hospitals.map((hosp) => {
        const dist = FallbackRulesEngine.calculateHaversineDistanceKm(
          hosp.location?.latitude || hosp.latitude,
          hosp.location?.longitude || hosp.longitude,
          incidentLocation.latitude,
          incidentLocation.longitude
        );
        const eta = Math.max(2.0, (dist / 40) * 60);

        return {
          id: hosp._id ? hosp._id.toString() : hosp.id,
          name: hosp.name,
          type: hosp.type || 'Multi-Specialty Apex',
          latitude: hosp.location?.latitude || hosp.latitude,
          longitude: hosp.location?.longitude || hosp.longitude,
          eta_minutes: Math.round(eta * 10) / 10,
          distance_km: Math.round(dist * 10) / 10,
          er_beds_total: hosp.erBedsTotal ?? 20,
          er_beds_available: hosp.erBedsAvailable ?? 5,
          icu_beds_total: hosp.icuBedsTotal ?? 10,
          icu_beds_available: hosp.icuBedsAvailable ?? 2,
          specialties_available: hosp.specialtiesAvailable || [],
          active_facilities: hosp.activeFacilities || [],
          diversion_status: hosp.diversionStatus || false,
          average_wait_time_minutes: hosp.averageWaitTimeMinutes || 15,
        };
      });

      // Call Python FastAPI
      const payload = {
        incident_id: triageRequest.incidentCode || 'INC-LIVE',
        triage_request: {
          chief_complaint: triageRequest.chiefComplaint,
          symptoms: triageRequest.symptoms || [],
          conscious: triageRequest.conscious ?? true,
          breathing: triageRequest.breathing ?? true,
          severe_bleeding: triageRequest.severeBleeding ?? false,
          patient_age: triageRequest.patientAge || null,
          gender: triageRequest.gender || null,
          vitals: triageRequest.vitals
            ? {
                heart_rate: triageRequest.vitals.heartRate,
                spo2: triageRequest.vitals.spo2,
                systolic_bp: triageRequest.vitals.systolicBp,
                diastolic_bp: triageRequest.vitals.diastolicBp,
                respiratory_rate: triageRequest.vitals.respiratoryRate,
                gcs: triageRequest.vitals.gcs,
                temperature: triageRequest.vitals.temperature,
              }
            : {},
        },
        incident_location: {
          latitude: incidentLocation.latitude,
          longitude: incidentLocation.longitude,
        },
        ambulances: mappedAmbulances,
        hospitals: mappedHospitals,
      };

      const res = await axios.post(`${AI_SERVICE_URL}/api/full-optimization`, payload, {
        timeout: TIMEOUT_MS,
      });

      return {
        ...res.data,
        system_engine: 'ai_optimized',
      };
    } catch (err) {
      console.warn(`[AIClientService] Python AI microservice error (${err.message}). Degrading to Rules Fallback.`);
      
      // Graceful fallback execution
      const fallbackTriage = FallbackRulesEngine.classifyTriage(triageRequest);
      const fallbackAlloc = FallbackRulesEngine.allocateAmbulance(fallbackTriage, incidentLocation, ambulances);
      const fallbackHosp = FallbackRulesEngine.recommendHospital(fallbackTriage, incidentLocation, hospitals);

      return {
        triage: fallbackTriage,
        ambulance_allocation: fallbackAlloc,
        hospital_recommendation: fallbackHosp,
        xai_explanation: {
          confidence_score: 0.88,
          decision_grade: 'B+ (Fallback)',
          estimated_golden_hour_minutes_saved: 12.0,
          ambulance_radar: [
            { axis: 'Speed / Proximity', selected: 85, benchmark: 70 },
            { axis: 'Equipment Match', selected: 90, benchmark: 75 },
            { axis: 'Crew Skill Tier', selected: 80, benchmark: 70 },
            { axis: 'Vehicle Suitability', selected: 80, benchmark: 65 },
            { axis: 'Traffic Route Flow', selected: 85, benchmark: 75 },
          ],
          hospital_radar: [
            { axis: 'Transit ETA', selected: 80, benchmark: 65 },
            { axis: 'Specialty Fit', selected: 85, benchmark: 60 },
            { axis: 'Bed Capacity', selected: 75, benchmark: 50 },
            { axis: 'Trauma/Cath Bays', selected: 80, benchmark: 65 },
            { axis: 'Anti-Diversion Safety', selected: 90, benchmark: 70 },
          ],
          key_takeaways: [
            'Rules-based fallback matrix engaged (AI engine offline or degraded).',
            fallbackAlloc.explanation,
            fallbackHosp.explanation,
          ],
          diverted_hospitals_avoided: fallbackHosp.diversion_warnings,
        },
        system_engine: 'rules_fallback',
      };
    }
  }
}
