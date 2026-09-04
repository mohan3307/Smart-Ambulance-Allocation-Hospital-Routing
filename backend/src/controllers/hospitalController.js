import { DataStore } from '../services/dataStore.js';
import { broadcastEvent } from '../services/socketManager.js';

export const getHospitals = async (req, res) => {
  try {
    const hospitals = await DataStore.getHospitals();
    res.json({ success: true, data: hospitals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const getHospitalById = async (req, res) => {
  try {
    const hospital = await DataStore.getHospitalById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }
    res.json({ success: true, data: hospital });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const updateHospitalBeds = async (req, res) => {
  try {
    const { id } = req.params;
    const { erBedsAvailable, icuBedsAvailable, diversionStatus } = req.body;

    const current = await DataStore.getHospitalById(id);
    if (!current) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }

    const updates = {};
    if (erBedsAvailable !== undefined) updates.erBedsAvailable = Number(erBedsAvailable);
    if (icuBedsAvailable !== undefined) updates.icuBedsAvailable = Number(icuBedsAvailable);
    if (diversionStatus !== undefined) updates.diversionStatus = Boolean(diversionStatus);

    const updated = await DataStore.updateHospitalBeds(id, updates);

    broadcastEvent('hospital:beds_updated', {
      hospitalId: id,
      name: current.name,
      ...updates,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

export const prepareEmergencyBay = async (req, res) => {
  try {
    const { id } = req.params;
    const { bayType, incidentCode } = req.body;

    const hospital = await DataStore.getHospitalById(id);
    if (!hospital) {
      return res.status(404).json({ success: false, error: 'Hospital not found' });
    }

    const notification = {
      hospitalId: id,
      hospitalName: hospital.name,
      bayType: bayType || 'Critical Resuscitation Trauma Bay 1',
      incidentCode,
      status: 'Ready & Reserved',
      timestamp: new Date(),
    };

    broadcastEvent('hospital:bay_prepared', notification);

    res.json({ success: true, message: 'Emergency Bay prepared and reserved', notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
