import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema(
  {
    incidentCode: { type: String, required: true, unique: true },
    callerName: { type: String, default: 'Bystander' },
    callerPhone: { type: String, default: 'Emergency Contact' },
    source: { type: String, enum: ['Bystander_SOS', 'Emergency_Call', 'Automated_Crash_Sensor'], default: 'Bystander_SOS' },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: 'Location detected via GPS' },
    },
    chiefComplaint: { type: String, required: true },
    symptoms: [{ type: String }],
    conscious: { type: Boolean, default: true },
    breathing: { type: Boolean, default: true },
    severeBleeding: { type: Boolean, default: false },
    casualtyCount: { type: Number, default: 1 },
    sceneHazards: [{ type: String }], // e.g. ["Traffic", "Fire", "Electrical", "Biohazard"]

    vitals: {
      heartRate: Number,
      spo2: Number,
      systolicBp: Number,
      diastolicBp: Number,
      respiratoryRate: Number,
      gcs: Number,
      temperature: Number,
    },

    triage: {
      esiLevel: { type: Number, enum: [1, 2, 3, 4, 5], default: 3 },
      triageColor: { type: String, default: 'Yellow' },
      categoryName: { type: String, default: 'Urgent' },
      severityScore: { type: Number, default: 50.0 },
      recommendedSpecialties: [{ type: String }],
      requiredEquipment: [{ type: String }],
      minParamedicSkill: { type: String, default: 'Basic' },
      firstAidGuidanceKey: { type: String, default: 'general_comfort' },
      clinicalFlags: [{ type: String }],
      explanation: { type: String, default: '' },
      triageTimestamp: Date,
      engine: { type: String, default: 'ai_optimized' },
    },

    assignedAmbulance: {
      ambulanceId: String,
      callSign: String,
      dispatchedAt: Date,
      estimatedArrivalMinutes: Number,
      allocationScore: Number,
      allocationRationale: String,
    },

    targetHospital: {
      hospitalId: String,
      name: String,
      bedReserved: { type: Boolean, default: false },
      estimatedArrivalMinutes: Number,
      recommendationScore: Number,
      recommendationRationale: String,
    },

    greenCorridorActive: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['Reported', 'Triaged', 'Dispatched', 'En_Route_Scene', 'On_Scene', 'En_Route_Hospital', 'Arrived_Hospital', 'Resolved'],
      default: 'Reported',
    },

    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

export const Incident = mongoose.model('Incident', IncidentSchema);
