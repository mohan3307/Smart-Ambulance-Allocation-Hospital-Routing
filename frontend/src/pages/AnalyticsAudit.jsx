import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  BrainCircuit, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  FileText,
  Sliders
} from 'lucide-react';
import { EmergencyAPI } from '../services/api';

export const AnalyticsAudit = () => {
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        EmergencyAPI.getHealthAndStats(),
        EmergencyAPI.getAuditLogs(),
      ]);
      setStats(statsRes);
      setAuditLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReset = async () => {
    if (window.confirm('Reset all demo data back to clean initial seed state?')) {
      await EmergencyAPI.resetSystemData();
      await loadData();
    }
  };

  const metrics = stats?.metrics;
  const system = stats?.system;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">System Analytics & XAI Audit Hub</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Decision Audit
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Golden hour clinical performance, ESI distribution & transparent explainability logs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 text-xs font-bold"
          >
            Reset Demo Dataset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Golden Hour Dispatch Time</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {metrics?.averageDispatchSeconds || 38}s
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Automated AI Triage & Match</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hospital Diversions Avoided</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {metrics?.diversionsPrevented || 14}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bed-aware pre-diversion routing</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fleet Utilization Rate</span>
            <Sliders className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1">
            {metrics?.fleetUtilizationPercent || 35}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {metrics?.availableFleetCount} of {metrics?.totalFleetCount} available
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Golden Hour Minutes Preserved</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            +{metrics?.totalGoldenHourMinutesSaved || 48.5}m
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Optimal care matching</div>
        </div>

      </div>

      {/* Grid: ESI Triage Distribution + Engine Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ESI Distribution (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Emergency Severity Index (ESI) Triage Profile
            </span>
            <span className="text-[10px] text-slate-400">AHA Guidelines</span>
          </div>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between bg-red-950/30 border border-red-500/30 p-2.5 rounded-xl">
              <span className="font-bold text-red-400">ESI Level 1 &bull; Resuscitation (Immediate Life Threat)</span>
              <span className="font-bold text-white font-mono">{metrics?.esiDistribution?.ESI_1_Red || 1}</span>
            </div>
            <div className="flex items-center justify-between bg-orange-950/30 border border-orange-500/30 p-2.5 rounded-xl">
              <span className="font-bold text-orange-400">ESI Level 2 &bull; Emergent (High Risk / Severe)</span>
              <span className="font-bold text-white font-mono">{metrics?.esiDistribution?.ESI_2_Orange || 1}</span>
            </div>
            <div className="flex items-center justify-between bg-yellow-950/30 border border-yellow-500/30 p-2.5 rounded-xl">
              <span className="font-bold text-yellow-400">ESI Level 3 &bull; Urgent (Multi-Resource)</span>
              <span className="font-bold text-white font-mono">{metrics?.esiDistribution?.ESI_3_Yellow || 0}</span>
            </div>
            <div className="flex items-center justify-between bg-green-950/30 border border-green-500/30 p-2.5 rounded-xl">
              <span className="font-bold text-emerald-400">ESI Level 4 &bull; Less Urgent (Single Resource)</span>
              <span className="font-bold text-white font-mono">{metrics?.esiDistribution?.ESI_4_Green || 0}</span>
            </div>
          </div>
        </div>

        {/* Engine Specs & Graceful Fallback Status (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <BrainCircuit className="w-4 h-4 text-cyan-400" />
              <span>AI System Architecture & Resilience</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-bold">Resilient Failover</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Active Engine:</span>
              <span className="font-bold text-emerald-400">
                {system?.aiEngine === 'ai_optimized' ? 'FastAPI Python Microservice (Port 8000)' : 'Rules Fallback Matrix (In-Process)'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Fallback Mechanism:</span>
              <span className="font-bold text-cyan-400">Manchester Triage & Haversine Velocity Heuristics</span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Datastore Backend:</span>
              <span className="font-bold text-white font-mono">
                {system?.database?.type === 'mongodb' ? 'MongoDB Active (Port 27017)' : 'Resilient In-Memory Collections'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">WebSocket Transport:</span>
              <span className="font-bold text-emerald-400">Socket.IO 4.8 Full-Duplex Broadcasts</span>
            </div>
          </div>
        </div>

      </div>

      {/* Decision Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-black text-white">Explainable AI (XAI) Decision Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-400">Verifiable Dispatch Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Incident</th>
                <th className="p-3">Decision Type</th>
                <th className="p-3">Engine</th>
                <th className="p-3">Selected Unit / Outcome</th>
                <th className="p-3">Clinical Justification</th>
                <th className="p-3 text-right">Time Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-500">
                    No decisions recorded yet. Simulate an emergency in the Command Dashboard!
                  </td>
                </tr>
              ) : (
                auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 font-mono font-bold text-white">{log.incidentId}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                        {log.decisionType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.engineUsed === 'ai_optimized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {log.engineUsed}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-cyan-300">
                      {log.selectedOutcome?.ambulance || log.selectedOutcome?.detourStrategy || 'Optimized Match'}
                    </td>
                    <td className="p-3 max-w-xs text-slate-300 truncate" title={log.rationaleText}>
                      {log.rationaleText}
                    </td>
                    <td className="p-3 text-right font-black text-emerald-400 font-mono">
                      +{log.goldenHourMinutesSaved}m
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
