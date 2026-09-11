import { Incident } from '../models/Incident.js';
import { Ambulance } from '../models/Ambulance.js';
import { Hospital } from '../models/Hospital.js';
import { AuditLog } from '../models/AuditLog.js';
import { seedHospitals, seedAmbulances, seedIncidents } from '../seed/seedData.js';
import { getDBStatus } from '../config/db.js';

// Normalize location to GeoJSON Point format: { type: 'Point', coordinates: [lon, lat], latitude, longitude }
export const normalizeLocation = (item) => {
  if (!item) return item;
  const loc = item.location || {};
  const lat = loc.latitude ?? (loc.coordinates ? loc.coordinates[1] : 12.9716);
  const lon = loc.longitude ?? (loc.coordinates ? loc.coordinates[0] : 77.5946);
  return {
    ...item,
    location: {
      ...loc,
      type: 'Point',
      coordinates: [lon, lat],
      latitude: lat,
      longitude: lon,
    },
  };
};

const haversineMeters = (lon1, lat1, lon2, lat2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// In-Memory fallback store with GeoJSON normalized coordinates
let memoryHospitals = [...seedHospitals.map((h, i) => normalizeLocation({ ...h, id: `HOSP-${i + 1}`, _id: `HOSP-${i + 1}` }))];
let memoryAmbulances = [...seedAmbulances.map((a, i) => normalizeLocation({ ...a, id: `AMB-${i + 1}`, _id: `AMB-${i + 1}` }))];
let memoryIncidents = [...seedIncidents.map((inc, i) => normalizeLocation({ ...inc, id: `INC-${i + 1}`, _id: `INC-${i + 1}` }))];
let memoryAuditLogs = [];

export class DataStore {
  static async initialize() {
    memoryHospitals = [...seedHospitals.map((h, i) => normalizeLocation({ ...h, id: `HOSP-${i + 1}`, _id: `HOSP-${i + 1}` }))];
    memoryAmbulances = [...seedAmbulances.map((a, i) => normalizeLocation({ ...a, id: `AMB-${i + 1}`, _id: `AMB-${i + 1}` }))];
    memoryIncidents = [...seedIncidents.map((inc, i) => normalizeLocation({ ...inc, id: `INC-${i + 1}`, _id: `INC-${i + 1}` }))];

    const status = getDBStatus();
    if (status.connected) {
      try {
        const hospCount = await Hospital.countDocuments();
        if (hospCount === 0) {
          console.log('[DataStore] Seeding Hospitals with 2dsphere GeoJSON into MongoDB...');
          await Hospital.insertMany(seedHospitals.map(normalizeLocation));
        }

        const ambCount = await Ambulance.countDocuments();
        if (ambCount === 0) {
          console.log('[DataStore] Seeding Ambulances with 2dsphere GeoJSON into MongoDB...');
          await Ambulance.insertMany(seedAmbulances.map(normalizeLocation));
        }

        const incCount = await Incident.countDocuments();
        if (incCount === 0) {
          console.log('[DataStore] Seeding Incidents with 2dsphere GeoJSON into MongoDB...');
          await Incident.insertMany(seedIncidents.map(normalizeLocation));
        }
        console.log('[DataStore] MongoDB DataStore initialized with 2dsphere indexing.');
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

  // --- Geospatial Queries (MongoDB $geoNear 2dsphere with In-Memory fallback) ---
  static async findNearestAmbulances(arg1, arg2, arg3, arg4) {
    let lon, lat, maxDistanceMeters, queryFilter;
    if (typeof arg1 === 'object' && arg1 !== null) {
      lon = arg1.longitude ?? arg1.lon ?? arg1.coordinates?.[0] ?? 77.5946;
      lat = arg1.latitude ?? arg1.lat ?? arg1.coordinates?.[1] ?? 12.9716;
      maxDistanceMeters = typeof arg2 === 'number' ? arg2 : 35000;
      queryFilter = typeof arg3 === 'object' && arg3 !== null ? arg3 : (typeof arg2 === 'object' && arg2 !== null ? arg2 : {});
    } else {
      lon = Number(arg1) || 77.5946;
      lat = Number(arg2) || 12.9716;
      maxDistanceMeters = typeof arg3 === 'number' ? arg3 : 35000;
      queryFilter = typeof arg4 === 'object' && arg4 !== null ? arg4 : {};
    }

    if (getDBStatus().connected) {
      try {
        const results = await Ambulance.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lon, lat] },
              distanceField: 'distanceMeters',
              maxDistance: maxDistanceMeters,
              spherical: true,
              query: queryFilter,
            },
          },
          {
            $addFields: {
              distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
              _distanceToScene: { $divide: ['$distanceMeters', 1000] },
            },
          },
        ]);
        if (results && results.length > 0) return results;
      } catch (e) {
        console.warn('[DataStore] $geoNear ambulance query fallback:', e.message);
      }
    }

    // In-Memory Spatial Fallback
    return memoryAmbulances
      .filter((a) => {
        if (queryFilter.status && a.status !== queryFilter.status) return false;
        return true;
      })
      .map((a) => {
        const aLon = a.location?.coordinates?.[0] ?? a.location?.longitude ?? 77.5946;
        const aLat = a.location?.coordinates?.[1] ?? a.location?.latitude ?? 12.9716;
        const distMeters = haversineMeters(lon, lat, aLon, aLat);
        const distKm = Math.round((distMeters / 1000) * 10) / 10;
        return {
          ...a,
          distanceMeters: distMeters,
          distanceKm: distKm,
          _distanceToScene: distKm,
        };
      })
      .filter((a) => a.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  static async findNearestHospitals(arg1, arg2, arg3, arg4) {
    let lon, lat, maxDistanceMeters, queryFilter;
    if (typeof arg1 === 'object' && arg1 !== null) {
      lon = arg1.longitude ?? arg1.lon ?? arg1.coordinates?.[0] ?? 77.5946;
      lat = arg1.latitude ?? arg1.lat ?? arg1.coordinates?.[1] ?? 12.9716;
      maxDistanceMeters = typeof arg2 === 'number' ? arg2 : 45000;
      queryFilter = typeof arg3 === 'object' && arg3 !== null ? arg3 : (typeof arg2 === 'object' && arg2 !== null ? arg2 : {});
    } else {
      lon = Number(arg1) || 77.5946;
      lat = Number(arg2) || 12.9716;
      maxDistanceMeters = typeof arg3 === 'number' ? arg3 : 45000;
      queryFilter = typeof arg4 === 'object' && arg4 !== null ? arg4 : {};
    }

    if (getDBStatus().connected) {
      try {
        const results = await Hospital.aggregate([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lon, lat] },
              distanceField: 'distanceMeters',
              maxDistance: maxDistanceMeters,
              spherical: true,
              query: queryFilter,
            },
          },
          {
            $addFields: {
              distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] },
              _distanceToScene: { $divide: ['$distanceMeters', 1000] },
            },
          },
        ]);
        if (results && results.length > 0) return results;
      } catch (e) {
        console.warn('[DataStore] $geoNear hospital query fallback:', e.message);
      }
    }

    // In-Memory Spatial Fallback
    return memoryHospitals
      .filter((h) => {
        if (queryFilter.diversionStatus !== undefined && h.diversionStatus !== queryFilter.diversionStatus) return false;
        return true;
      })
      .map((h) => {
        const hLon = h.location?.coordinates?.[0] ?? h.location?.longitude ?? 77.5946;
        const hLat = h.location?.coordinates?.[1] ?? h.location?.latitude ?? 12.9716;
        const distMeters = haversineMeters(lon, lat, hLon, hLat);
        const distKm = Math.round((distMeters / 1000) * 10) / 10;
        return {
          ...h,
          distanceMeters: distMeters,
          distanceKm: distKm,
          _distanceToScene: distKm,
        };
      })
      .filter((h) => h.distanceMeters <= maxDistanceMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
