import { Incident } from '../models/Incident.js';
import { Ambulance } from '../models/Ambulance.js';
import { Hospital } from '../models/Hospital.js';
import { AuditLog } from '../models/AuditLog.js';
import { seedHospitals, seedAmbulances, seedIncidents } from '../seed/seedData.js';
import { getDBStatus } from '../config/db.js';

// In-Memory fallback store
let memoryHospitals = [...seedHospitals.map((h, i) => ({ ...h, id: `HOSP-${i + 1}`, _id: `HOSP-${i + 1}` }))];
let memoryAmbulances = [...seedAmbulances.map((a, i) => ({ ...a, id: `AMB-${i + 1}`, _id: `AMB-${i + 1}` }))];
let memoryIncidents = [...seedIncidents.map((inc, i) => ({ ...inc, id: `INC-${i + 1}`, _id: `INC-${i + 1}` }))];
let memoryAuditLogs = [];

export class DataStore {
  static async initialize() {
    memoryHospitals = [...seedHospitals.map((h, i) => ({ ...h, id: `HOSP-${i + 1}`, _id: `HOSP-${i + 1}` }))];
    memoryAmbulances = [...seedAmbulances.map((a, i) => ({ ...a, id: `AMB-${i + 1}`, _id: `AMB-${i + 1}` }))];
    memoryIncidents = [...seedIncidents.map((inc, i) => ({ ...inc, id: `INC-${i + 1}`, _id: `INC-${i + 1}` }))];

    const status = getDBStatus();
    if (status.connected) {
      try {
        const hospCount = await Hospital.countDocuments();
        if (hospCount === 0) {
          console.log('[DataStore] Seeding Hospitals into MongoDB...');
          await Hospital.insertMany(seedHospitals);
        }

        const ambCount = await Ambulance.countDocuments();
        if (ambCount === 0) {
          console.log('[DataStore] Seeding Ambulances into MongoDB...');
          await Ambulance.insertMany(seedAmbulances);
        }

        const incCount = await Incident.countDocuments();
        if (incCount === 0) {
          console.log('[DataStore] Seeding Incidents into MongoDB...');
          await Incident.insertMany(seedIncidents);
        }
        console.log('[DataStore] MongoDB DataStore initialized successfully.');
      } catch (err) {
        console.warn(`[DataStore] MongoDB init warning: ${err.message}. Using In-Memory fallback.`);
      }
    } else {
      console.log('[DataStore] In-Memory DataStore initialized with full seed dataset.');
    }
  }

  // --- Hospitals ---
  static async getHospitals() {
    if (getDBStatus().connected) {
      try {
        return await Hospital.find().lean();
      } catch (e) {}
    }
    return memoryHospitals;
  }

  static async getHospitalById(id) {
    if (getDBStatus().connected) {
      try {
        return await Hospital.findById(id).lean();
      } catch (e) {}
    }
    return memoryHospitals.find((h) => h.id === id || h._id === id);
  }

  static async updateHospitalBeds(id, updateData) {
    if (getDBStatus().connected) {
      try {
        return await Hospital.findByIdAndUpdate(id, updateData, { new: true }).lean();
      } catch (e) {}
    }
    const idx = memoryHospitals.findIndex((h) => h.id === id || h._id === id);
    if (idx !== -1) {
      memoryHospitals[idx] = { ...memoryHospitals[idx], ...updateData };
      return memoryHospitals[idx];
    }
    return null;
  }

  // --- Ambulances ---
  static async getAmbulances() {
    if (getDBStatus().connected) {
      try {
        return await Ambulance.find().lean();
      } catch (e) {}
    }
    return memoryAmbulances;
  }

  static async getAmbulanceById(id) {
    if (getDBStatus().connected) {
      try {
        return await Ambulance.findById(id).lean();
      } catch (e) {}
    }
    return memoryAmbulances.find((a) => a.id === id || a._id === id);
  }

  static async updateAmbulance(id, updateData) {
    if (getDBStatus().connected) {
      try {
        return await Ambulance.findByIdAndUpdate(id, updateData, { new: true }).lean();
      } catch (e) {}
    }
    const idx = memoryAmbulances.findIndex((a) => a.id === id || a._id === id);
    if (idx !== -1) {
      memoryAmbulances[idx] = { ...memoryAmbulances[idx], ...updateData };
      return memoryAmbulances[idx];
    }
    return null;
  }

  // --- Incidents ---
  static async getIncidents() {
    if (getDBStatus().connected) {
      try {
        return await Incident.find().sort({ createdAt: -1 }).lean();
      } catch (e) {}
    }
    return [...memoryIncidents].sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
  }

  static async getIncidentById(id) {
    if (getDBStatus().connected) {
      try {
        return await Incident.findById(id).lean();
      } catch (e) {}
    }
    return memoryIncidents.find((i) => i.id === id || i._id === id || i.incidentCode === id);
  }

  static async createIncident(incidentData) {
    if (getDBStatus().connected) {
      try {
        const created = await Incident.create(incidentData);
        return created.toObject();
      } catch (e) {}
    }
    const id = `INC-${Date.now()}`;
    const newInc = {
      ...incidentData,
      id,
      _id: id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryIncidents.unshift(newInc);
    return newInc;
  }

  static async updateIncident(id, updateData) {
    if (getDBStatus().connected) {
      try {
        return await Incident.findByIdAndUpdate(id, updateData, { new: true }).lean();
      } catch (e) {}
    }
    const idx = memoryIncidents.findIndex((i) => i.id === id || i._id === id || i.incidentCode === id);
    if (idx !== -1) {
      memoryIncidents[idx] = { ...memoryIncidents[idx], ...updateData, updatedAt: new Date().toISOString() };
      return memoryIncidents[idx];
    }
    return null;
  }

  // --- Audit Logs ---
  static async createAuditLog(logData) {
    if (getDBStatus().connected) {
      try {
        const created = await AuditLog.create(logData);
        return created.toObject();
      } catch (e) {}
    }
    const id = `AUDIT-${Date.now()}`;
    const newLog = { ...logData, id, _id: id, createdAt: new Date().toISOString() };
    memoryAuditLogs.unshift(newLog);
    return newLog;
  }

  static async getAuditLogs() {
    if (getDBStatus().connected) {
      try {
        return await AuditLog.find().sort({ createdAt: -1 }).limit(50).lean();
      } catch (e) {}
    }
    return memoryAuditLogs;
  }
}
