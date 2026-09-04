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
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
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
  { timestamps: true }
);

export const Ambulance = mongoose.model('Ambulance', AmbulanceSchema);
