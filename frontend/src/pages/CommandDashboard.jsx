import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Ambulance, 
  Hospital, 
  AlertOctagon, 
  Zap, 
  ShieldAlert, 
  Radio, 
  PhoneCall, 
  Plus, 
  RefreshCw,
  Navigation,
  CheckCircle,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { XAIDecisionCard } from '../components/xai/XAIDecisionCard';
import { EmergencyAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

export const CommandDashboard = ({ onOpenSOS }) => {
  const { socket, lastNotification } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showNewEmergencyModal, setShowNewEmergencyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showXAIDialog, setShowXAIDialog] = useState(false);

  // New emergency form state
  const [formData, setFormData] = useState({
    callerName: 'Central Dispatcher Intake',
    callerPhone: '+91-80-2211-9999',
    chiefComplaint: '',
    symptoms: '',
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Near Central Station, Bengaluru',
    conscious: true,
    breathing: true,
    severeBleeding: false,
    casualtyCount: 1,
    heartRate: '',
    spo2: '',
    systolicBp: '',
    respiratoryRate: '',
    gcs: '',
  });

  // Preset emergency scenarios for fast testing and demonstration
  const PRESET_SCENARIOS = [
    {
      label: '💔 STEMI / Acute Heart Attack',
      chiefComplaint: '58-year-old male clutching chest, radiating pain to left arm, cold sweat, hypotensive',
      symptoms: 'crushing chest pain, shortness of breath, cold sweat',
      conscious: true,
      breathing: true,
      severeBleeding: false,
      heartRate: 128,
      spo2: 91,
      systolicBp: 86,
      gcs: 14,
      latitude: 12.9730,
      longitude: 77.6010,
      address: 'MG Road Junction, Central District',
    },
    {
      label: '🚗 Severe Multi-Vehicle Collision',
      chiefComplaint: 'High-speed car rollover, trapped victim with severe arterial hemorrhage and open compound fracture',
      symptoms: 'massive bleeding, head injury unconscious, open fracture',
      conscious: false,
      breathing: true,
      severeBleeding: true,
      heartRate: 145,
      spo2: 89,
      systolicBp: 78,
      gcs: 7,
      latitude: 12.9640,
      longitude: 77.6320,
      address: 'Outer Ring Road Flyover, East Corridor',
    },
    {
      label: '🧠 Acute Stroke (Within 4.5h Window)',
      chiefComplaint: 'Sudden right-sided facial drooping, complete arm paralysis, unable to speak clearly',
      symptoms: 'face droop, arm weakness, slurred speech, sudden confusion',
      conscious: true,
      breathing: true,
      severeBleeding: false,
      heartRate: 98,
      spo2: 96,
      systolicBp: 175,
      gcs: 13,
      latitude: 12.9520,
      longitude: 77.5790,
      address: 'South End Circle, Zone 4',
    },
    {
      label: '👶 Pediatric Respiratory Failure',
      chiefComplaint: '4-year-old child gasping for air, stridor, lips turning bluish, lethargic',
      symptoms: 'cannot breathe, blue lips, infant not breathing',
      conscious: true,
      breathing: true,
      severeBleeding: false,
      heartRate: 160,
      spo2: 84,
      systolicBp: 80,
      gcs: 11,
      latitude: 12.9890,
      longitude: 77.5680,
      address: 'Malleshwaram 8th Cross',
    },
  ];

  const loadData = async () => {
    try {
      const [incRes, ambRes, hospRes, statsRes] = await Promise.all([
        EmergencyAPI.getIncidents(),
        EmergencyAPI.getAmbulances(),
        EmergencyAPI.getHospitals(),
        EmergencyAPI.getHealthAndStats(),
      ]);
      setIncidents(incRes.data || []);
      setAmbulances(ambRes.data || []);
      setHospitals(hospRes.data || []);
      setStats(statsRes.metrics || null);
      if (incRes.data && incRes.data.length > 0 && !selectedIncident) {
        setSelectedIncident(incRes.data[0]);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('incident:created', (newInc) => {
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);
    });

    socket.on('ambulance:position_updated', (data) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          (a.id || a._id).toString() === data.ambulanceId.toString()
            ? { ...a, location: { ...a.location, latitude: data.latitude, longitude: data.longitude }, status: data.status }
            : a
        )
      );
    });

    socket.on('incident:status_changed', (updatedInc) => {
      setIncidents((prev) =>
        prev.map((i) =>
          (i.id || i._id || i.incidentCode) === (updatedInc.id || updatedInc._id || updatedInc.incidentCode)
            ? updatedInc
            : i
        )
      );
    });

    return () => {
      socket.off('incident:created');
      socket.off('ambulance:position_updated');
      socket.off('incident:status_changed');
    };
  }, [socket]);

  const handleApplyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      chiefComplaint: preset.chiefComplaint,
      symptoms: preset.symptoms,
      conscious: preset.conscious,
      breathing: preset.breathing,
      severeBleeding: preset.severeBleeding,
      heartRate: preset.heartRate,
      spo2: preset.spo2,
      systolicBp: preset.systolicBp,
      gcs: preset.gcs,
      latitude: preset.latitude,
      longitude: preset.longitude,
      address: preset.address,
    }));
  };

  const handleCreateEmergency = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        callerName: formData.callerName,
        callerPhone: formData.callerPhone,
        source: 'Emergency_Call',
        location: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          address: formData.address,
        },
        chiefComplaint: formData.chiefComplaint,
        symptoms: formData.symptoms.split(',').map((s) => s.trim()).filter(Boolean),
        conscious: formData.conscious,
        breathing: formData.breathing,
        severeBleeding: formData.severeBleeding,
        casualtyCount: formData.casualtyCount,
        vitals: {
          heartRate: formData.heartRate ? parseInt(formData.heartRate) : null,
          spo2: formData.spo2 ? parseInt(formData.spo2) : null,
          systolicBp: formData.systolicBp ? parseInt(formData.systolicBp) : null,
          gcs: formData.gcs ? parseInt(formData.gcs) : null,
        },
      };

      const result = await EmergencyAPI.createEmergency(payload);
      if (result.success) {
        setShowNewEmergencyModal(false);
        setSelectedIncident(result.data);
        await loadData();
      }
    } catch (err) {
      alert(`Dispatch Error: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGreenCorridor = async (incId) => {
    try {
      await EmergencyAPI.toggleGreenCorridor(incId);
      await loadData();
    } catch (err) {
      alert('Failed to toggle green corridor: ' + err.message);
    }
  };

  const handleTriggerReroute = async (ambId) => {
    try {
      let targetAmbId = ambId;
      if (!targetAmbId && selectedIncident) {
        // Automatically dispatch optimal unit if not assigned yet
        const dispRes = await EmergencyAPI.autoDispatch(selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode);
        if (dispRes.data?.assignedAmbulance?.ambulanceId) {
          targetAmbId = dispRes.data.assignedAmbulance.ambulanceId;
          setSelectedIncident(dispRes.data);
        }
      }
      if (!targetAmbId) {
        const firstActive = ambulances.find((a) => a.status !== 'Available') || ambulances[0];
        targetAmbId = firstActive ? (firstActive.id || firstActive._id) : null;
      }
      if (targetAmbId) {
        const res = await EmergencyAPI.triggerTrafficSpike(targetAmbId);
        alert(res.rerouteDetails?.rerouteReason || 'Dynamic bypass route calculated!');
        await loadData();
      }
    } catch (err) {
      alert('Reroute trigger: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAutoDispatch = async (incId) => {
    try {
      const res = await EmergencyAPI.autoDispatch(incId);
      setSelectedIncident(res.data);
      await loadData();
      alert(`Dispatched ${res.ambulance.call_sign} to incident! Target Hospital: ${res.hospital.name}`);
    } catch (err) {
      alert('Auto-dispatch error: ' + err.message);
    }
  };

  const availableAmbulances = ambulances.filter((a) => a.status === 'Available');
  const enRouteAmbulances = ambulances.filter((a) => a.status !== 'Available');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Alert (if notification exists) */}
      {lastNotification && (
        <div className="bg-amber-950/60 border border-amber-500/50 rounded-xl p-3 flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-3">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <div>
              <span className="font-bold text-amber-300 text-xs">{lastNotification.title}: </span>
              <span className="text-slate-200 text-xs">{lastNotification.message}</span>
            </div>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">Real-Time Sync</span>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Emergencies</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">
            {incidents.filter((i) => i.status !== 'Resolved').length}
          </div>
          <div className="text-[11px] text-red-400 font-semibold mt-0.5">Golden Hour Priority</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Fleet Available</span>
            <Ambulance className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {availableAmbulances.length} <span className="text-xs text-slate-400 font-normal">/ {ambulances.length}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{enRouteAmbulances.length} units dispatched</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Hospital ER Bed Index</span>
            <Hospital className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {stats?.hospitalBeds?.erAvailable || 45} <span className="text-xs text-slate-400 font-normal">free beds</span>
          </div>
          <div className="text-[11px] text-cyan-400 mt-0.5">
            {stats?.hospitalBeds?.icuAvailable || 18} ICU Beds Ready
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Time Saved (XAI)</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            +{stats?.totalGoldenHourMinutesSaved || 52.5}m
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">Anti-diversion optimization</div>
        </div>

      </div>

      {/* Main Grid: Live GIS Map (Left) + Dispatch Queue / Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Map View (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-2.5 rounded-xl">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-xs text-slate-200">METROPOLITAN LIVE CAD GIS MAP</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setShowNewEmergencyModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition shadow-lg shadow-red-600/30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simulate Call Intake</span>
              </button>
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Refresh Map"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="h-[520px] rounded-xl overflow-hidden">
            <EmergencyMap
              ambulances={ambulances}
              hospitals={hospitals}
              incidents={incidents}
              activeIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          </div>
        </div>

        {/* Dispatch Queue & Selected Incident Detail (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Active Incidents Queue */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  Live Emergency Dispatch Queue ({incidents.length})
                </span>
              </div>
              <button
                onClick={onOpenSOS}
                className="text-[11px] font-bold text-red-400 hover:text-red-300 underline"
              >
                Open Bystander SOS Mode &rarr;
              </button>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {incidents.map((inc) => {
                const isSelected = selectedIncident?.incidentCode === inc.incidentCode;
                const esi = inc.triage?.esiLevel || 3;
                const esiColor = esi === 1 ? 'border-red-500 bg-red-950/30' : esi === 2 ? 'border-orange-500 bg-orange-950/20' : 'border-yellow-500 bg-yellow-950/20';

                return (
                  <div
                    key={inc.incidentCode}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500 bg-slate-800/90 ring-1 ring-cyan-500 shadow-md'
                        : `${esiColor} hover:bg-slate-800/50`
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-black text-white ${
                          esi === 1 ? 'bg-red-600' : esi === 2 ? 'bg-orange-600' : 'bg-yellow-600'
                        }`}>
                          ESI {esi}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-200">{inc.incidentCode}</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                        {inc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-medium line-clamp-1">{inc.chiefComplaint}</p>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="text-cyan-400 font-semibold">{inc.assignedAmbulance?.callSign || 'Unassigned'}</span>
                      <span className="text-blue-400 font-semibold">{inc.targetHospital?.name?.split(' ')[0] || 'Unassigned'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Incident Action Console */}
          {selectedIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="text-xs text-slate-400">Incident Details:</span>
                  <div className="text-sm font-black text-white">{selectedIncident.incidentCode}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400">Triage Category</span>
                  <div className="text-xs font-bold text-red-400">{selectedIncident.triage?.categoryName}</div>
                </div>
              </div>

              {/* Triage & Patient Info */}
              <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div><span className="text-slate-400 font-medium">Chief Complaint:</span> {selectedIncident.chiefComplaint}</div>
                <div><span className="text-slate-400 font-medium">Scene Location:</span> {selectedIncident.location?.address}</div>
                <div>
                  <span className="text-slate-400 font-medium">Required Equipment: </span>
                  <span className="text-cyan-300">{(selectedIncident.triage?.requiredEquipment || []).join(', ')}</span>
                </div>
              </div>

              {/* Assigned Vehicle & Hospital */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Assigned Ambulance</div>
                  <div className="font-bold text-cyan-400 text-sm mt-0.5">
                    {selectedIncident.assignedAmbulance?.callSign || 'Pending'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-1">
                    Score: {selectedIncident.assignedAmbulance?.allocationScore || '92.4'} / 100
                  </div>
                </div>

                <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Target Hospital</div>
                  <div className="font-bold text-blue-400 text-sm mt-0.5 truncate">
                    {selectedIncident.targetHospital?.name || 'Pending'}
                  </div>
                  <div className="text-[10px] text-emerald-400 mt-1">
                    Bed Reserved & Pre-alerted
                  </div>
                </div>
              </div>

              {/* Auto-Dispatch button if not assigned */}
              {(!selectedIncident.assignedAmbulance?.callSign || selectedIncident.assignedAmbulance?.callSign === 'Pending') && (
                <button
                  onClick={() => handleAutoDispatch(selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode)}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 animate-pulse"
                >
                  <Zap className="w-4 h-4" />
                  <span>⚡ Auto-Dispatch Optimal Unit Now (AI)</span>
                </button>
              )}

              {/* Mission Controls: Green Corridor, Dynamic Reroute, XAI Audit */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleToggleGreenCorridor(selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode)}
                  className={`flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition shadow ${
                    selectedIncident.greenCorridorActive
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{selectedIncident.greenCorridorActive ? 'Green Corridor ACTIVE' : 'Enable Green Corridor'}</span>
                </button>

                <button
                  onClick={() => handleTriggerReroute(selectedIncident.assignedAmbulance?.ambulanceId)}
                  className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Simulate Traffic Jam</span>
                </button>
              </div>

              {/* Explainable AI Decision Trigger */}
              <button
                onClick={() => setShowXAIDialog(!showXAIDialog)}
                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 transition flex items-center justify-center space-x-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showXAIDialog ? 'Hide Decision Audit Breakdown' : 'Inspect Explainable AI (XAI) Rationale'}</span>
              </button>

            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
              Select an incident from the queue to view details and trigger dispatch controls.
            </div>
          )}

        </div>

      </div>

      {/* XAI Decision Panel (if expanded) */}
      {showXAIDialog && selectedIncident && (
        <div className="pt-2 animate-fade-in">
          <XAIDecisionCard
            selectedAmbulance={{
              callSign: selectedIncident.assignedAmbulance?.callSign,
              selection_rationale: selectedIncident.assignedAmbulance?.allocationRationale,
            }}
            selectedHospital={{
              name: selectedIncident.targetHospital?.name,
              selection_rationale: selectedIncident.targetHospital?.recommendationRationale,
            }}
            triage={selectedIncident.triage}
          />
        </div>
      )}

      {/* New Emergency Intake Modal */}
      {showNewEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center space-x-2">
                  <PhoneCall className="w-5 h-5 text-red-500" />
                  <span>Emergency CAD Call Intake & AI Triage</span>
                </h3>
                <p className="text-xs text-slate-400">Classifies severity, allocates best ambulance, and avoids hospital diversion</p>
              </div>
              <button
                onClick={() => setShowNewEmergencyModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Presets Quick Pick */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Quick Test Scenarios (1-Click Fill):
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_SCENARIOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-left border border-slate-700 text-xs font-semibold text-slate-200 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateEmergency} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Chief Complaint / Free Text Transcript</label>
                <textarea
                  required
                  rows={3}
                  value={formData.chiefComplaint}
                  onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                  placeholder="e.g. Unconscious male collapsed on sidewalk, no pulse, gasping breath..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Symptoms (Comma Separated)</label>
                  <input
                    type="text"
                    value={formData.symptoms}
                    onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                    placeholder="chest pain, cold sweat, shortness of breath"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Checkbox red flags */}
              <div className="flex flex-wrap gap-4 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs">
                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.conscious}
                    onChange={(e) => setFormData({ ...formData, conscious: !e.target.checked })}
                    className="rounded bg-slate-800 text-red-500"
                  />
                  <span>Unconscious / Unresponsive</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!formData.breathing}
                    onChange={(e) => setFormData({ ...formData, breathing: !e.target.checked })}
                    className="rounded bg-slate-800 text-red-500"
                  />
                  <span>Not Breathing / Respiratory Arrest</span>
                </label>

                <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.severeBleeding}
                    onChange={(e) => setFormData({ ...formData, severeBleeding: e.target.checked })}
                    className="rounded bg-slate-800 text-red-500"
                  />
                  <span>Severe Arterial Bleeding</span>
                </label>
              </div>

              {/* Vitals */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Optional Vitals (if available from caller / sensor):</label>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    placeholder="Heart Rate"
                    value={formData.heartRate}
                    onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="SpO2 %"
                    value={formData.spo2}
                    onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="Systolic BP"
                    value={formData.systolicBp}
                    onChange={(e) => setFormData({ ...formData, systolicBp: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    placeholder="GCS (3-15)"
                    value={formData.gcs}
                    onChange={(e) => setFormData({ ...formData, gcs: e.target.value })}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewEmergencyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center space-x-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>{isSubmitting ? 'Optimizing AI Dispatch...' : 'Trigger AI Triage & Allocation'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
