import mongoose from 'mongoose';

const AmbulanceSchema = new mongoose.Schema(
  {
    callSign: { type: String, required: true, unique: true },
    vehicleNumber: { type: String, required: true },
    ambulanceType: {
      type: String,
      enum: ['MICU', 'ALS', 'BLS', 'PALS', 'Transport'],
      default: 'ALS',
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
      heading: { type: Number, default: 0 },
      speedKmH: { type: Number, default: 45 },
    },
    status: {
      type: String,
      enum: ['Available', 'Dispatched', 'En_Route_Scene', 'On_Scene', 'En_Route_Hospital', 'Returning', 'Maintenance'],
      default: 'Available',
    },
    equipment: [{ type: String }],
    paramedicCrew: {
      leadParamedic: { type: String, required: true },
      skillLevel: {
        type: String,
        enum: ['Doctor', 'Critical_Care', 'Advanced', 'Intermediate', 'Basic'],
        default: 'Advanced',
      },
      crewCount: { type: Number, default: 2 },
    },
    currentIncidentId: { type: String, default: null },
    targetHospitalId: { type: String, default: null },
    activeRoute: [
      {
        latitude: Number,
        longitude: Number,
      },
    ],
    routeProgressIndex: { type: Number, default: 0 },
    trafficDelayFactor: { type: Number, default: 1.0 },
    fuelPercent: { type: Number, default: 92 },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// 2dsphere Geospatial Index for native $near / $geoNear queries
AmbulanceSchema.index({ 'location': '2dsphere' });

// Pre-save hook to ensure both coordinates [lon, lat] and { latitude, longitude } stay in sync
AmbulanceSchema.pre('save', function (next) {
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

export const Ambulance = mongoose.model('Ambulance', AmbulanceSchema);
