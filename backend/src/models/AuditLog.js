import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    decisionType: {
      type: String,
      enum: ['Triage', 'Ambulance_Allocation', 'Hospital_Recommendation', 'Reroute_Triggered', 'Green_Corridor'],
      required: true,
    },
    incidentId: { type: String, required: true },
    engineUsed: { type: String, default: 'ai_optimized' }, // 'ai_optimized' | 'rules_fallback'
    inputParameters: { type: mongoose.Schema.Types.Mixed },
    selectedOutcome: { type: mongoose.Schema.Types.Mixed },
    alternativeOptions: [{ type: mongoose.Schema.Types.Mixed }],
    rationaleText: { type: String, required: true },
    goldenHourMinutesSaved: { type: Number, default: 0 },
    xaiMetrics: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
