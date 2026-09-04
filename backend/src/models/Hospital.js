import mongoose from 'mongoose';

const HospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['Level 1 Trauma Center', 'Cardiac & Stroke Center', 'Multi-Specialty Apex', 'Community Hospital', 'Pediatric Institute'],
      default: 'Multi-Specialty Apex',
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    erBedsTotal: { type: Number, required: true, default: 20 },
    erBedsAvailable: { type: Number, required: true, default: 5 },
    icuBedsTotal: { type: Number, required: true, default: 12 },
    icuBedsAvailable: { type: Number, required: true, default: 3 },
    specialtiesAvailable: [{ type: String }],
    activeFacilities: [{ type: String }],
    diversionStatus: { type: Boolean, default: false },
    averageWaitTimeMinutes: { type: Number, default: 15 },
    contactPhone: { type: String, default: '108' },
    incomingAmbulances: [
      {
        ambulanceId: String,
        callSign: String,
        incidentId: String,
        esiLevel: Number,
        chiefComplaint: String,
        etaMinutes: Number,
        status: String,
      },
    ],
  },
  { timestamps: true }
);

export const Hospital = mongoose.model('Hospital', HospitalSchema);
