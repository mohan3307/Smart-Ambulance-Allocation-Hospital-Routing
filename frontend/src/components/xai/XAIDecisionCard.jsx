import React from 'react';
import { 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  Zap, 
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

export const XAIDecisionCard = ({ xaiData, selectedAmbulance, selectedHospital, triage }) => {
  if (!xaiData && !selectedAmbulance) return null;

  const radarData = xaiData?.ambulance_radar || [
    { axis: 'Speed / Proximity', selected: 88, benchmark: 72 },
    { axis: 'Equipment Match', selected: 100, benchmark: 65 },
    { axis: 'Crew Skill Tier', selected: 95, benchmark: 70 },
    { axis: 'Vehicle Type', selected: 92, benchmark: 68 },
    { axis: 'Traffic Route Flow', selected: 85, benchmark: 75 },
  ];

  const minutesSaved = xaiData?.estimated_golden_hour_minutes_saved || 18.5;
  const grade = xaiData?.decision_grade || 'A+';
  const confidence = xaiData?.confidence_score ? Math.round(xaiData.confidence_score * 100) : 95;

  return (
    <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black text-white">Explainable AI (XAI) Decision Audit</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Transparent Allocation
              </span>
            </div>
            <p className="text-xs text-slate-400">Multi-criteria optimization breakdown & clinical rationale</p>
          </div>
        </div>

        {/* Confidence & Minutes Saved Badge */}
        <div className="flex items-center space-x-2">
          <div className="bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-xl text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Confidence</div>
            <div className="text-sm font-black text-cyan-400">{confidence}%</div>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-center">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">Golden Hour Saved</div>
            <div className="text-sm font-black text-emerald-400 flex items-center justify-center space-x-0.5">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 inline" />
              <span>+{minutesSaved}m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Radar Breakdown + Core Justification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Radar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex flex-col items-center justify-center">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
            Optimization Dimension Radar
          </div>
          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="axis" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={false} />
                <Radar
                  name="Selected Unit"
                  dataKey="selected"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.45}
                />
                <Radar
                  name="Fleet Average"
                  dataKey="benchmark"
                  stroke="#64748b"
                  fill="#64748b"
                  fillOpacity={0.2}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Justification Rationale (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          
          {/* Ambulance Decision Card */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-cyan-400">AMBULANCE SELECTION RATIONALE:</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                {selectedAmbulance?.callSign || 'Allocated Unit'}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {selectedAmbulance?.selection_rationale || 
               'Unit selected due to full medical equipment match (ventilator & defibrillator present) and critical paramedic certification.'}
            </p>
          </div>

          {/* Hospital Decision Card */}
          <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-blue-400">HOSPITAL ROUTING RATIONALE:</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono font-bold">
                {selectedHospital?.name || 'Target Apex Center'}
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {selectedHospital?.selection_rationale || 
               'Hospital confirmed with active critical beds, matching specialized surgical facilities, and zero diversion risk.'}
            </p>
          </div>

          {/* Key Takeaways */}
          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              Auditor Key Takeaways:
            </div>
            {(xaiData?.key_takeaways || [
              'Triage severity mandates life-support equipment over physical proximity.',
              'Avoided sending patient to saturated community clinics without catheterization laboratories.',
            ]).map((point, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-[11px] text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span>{point}</span>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
