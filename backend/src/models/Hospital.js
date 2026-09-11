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
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        default: [77.5946, 12.9716],
      },
      latitude: { type: Number },
      longitude: { type: Number },
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
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 2dsphere Geospatial Index for Hospital lookup
HospitalSchema.index({ 'location': '2dsphere' });

// Pre-save hook to ensure both coordinates [lon, lat] and { latitude, longitude } stay in sync
HospitalSchema.pre('save', function (next) {
  if (this.location) {
    if (this.location.latitude != null && this.location.longitude != null && (!this.location.coordinates || this.location.coordinates.length === 0)) {
      this.location.coordinates = [this.location.longitude, this.location.latitude];
      this.location.type = 'Point';
    } else if (this.location.coordinates && this.location.coordinates.length === 2) {
      this.location.longitude = this.location.coordinates[0];
      this.location.latitude = this.location.coordinates[1];
      this.location.type = 'Point';
    }
  }
  next();
});

export const Hospital = mongoose.model('Hospital', HospitalSchema);
