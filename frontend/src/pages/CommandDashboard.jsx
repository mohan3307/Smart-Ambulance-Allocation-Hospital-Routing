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
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
  MapPin,
  Clock,
  ArrowRight,
  HeartPulse,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { XAIDecisionCard } from '../components/xai/XAIDecisionCard';
import { EmergencyAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SoundFX } from '../services/soundEffects';

export const CommandDashboard = ({ onOpenSOS }) => {
  const { socket, lastNotification } = useSocket();
  const [incidents, setIncidents] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [selectedRegionId, setSelectedRegionId] = useState('TN');
  const [showNewEmergencyModal, setShowNewEmergencyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showXAIDialog, setShowXAIDialog] = useState(false);
  const [toast, setToast] = useState(null);
  const [isFullMap, setIsFullMap] = useState(false);
  const [cadPanelTab, setCadPanelTab] = useState('detail'); // 'detail' | 'queue' | 'split'
  const [queueFilter, setQueueFilter] = useState('all'); // 'all' | 'critical' | 'enroute'

  const showToast = (message, type = 'info', title = '') => {
    setToast({ message, type, title });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

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
  // Multi-state preset emergency scenarios for fast testing and demonstration
  const PRESET_SCENARIOS = [
    {
      label: '💔 TN (Chennai): T.Nagar STEMI Cardiac Attack',
      chiefComplaint: '58-year-old male clutching chest, radiating pain to left arm, cold sweat, hypotensive',
      symptoms: 'crushing chest pain, shortness of breath, cold sweat',
      conscious: true,
      breathing: true,
      severeBleeding: false,
      heartRate: 128,
      spo2: 91,
      systolicBp: 86,
      gcs: 14,
      latitude: 13.0418,
      longitude: 80.2341,
      address: 'Usman Road, T.Nagar, Chennai, Tamil Nadu',
    },
    {
      label: '🚗 TN (Chennai): OMR Expressway Crash',
      chiefComplaint: 'High-speed car rollover, trapped victim with severe arterial hemorrhage and open compound fracture',
      symptoms: 'massive bleeding, head injury unconscious, open fracture',
      conscious: false,
      breathing: true,
      severeBleeding: true,
      heartRate: 145,
      spo2: 89,
      systolicBp: 78,
      gcs: 7,
      latitude: 12.9750,
      longitude: 80.2500,
      address: 'OMR IT Corridor, Thoraipakkam, Chennai, Tamil Nadu',
    },
    {
      label: '🏙️ MH (Mumbai): Dadar Traffic Collision',
      chiefComplaint: 'Multi-vehicle collision on Dadar flyover, victim trapped with head trauma and tachypnea',
      symptoms: 'trauma, bleeding, shortness of breath',
      conscious: true,
      breathing: true,
      severeBleeding: true,
      heartRate: 138,
      spo2: 92,
      systolicBp: 88,
      gcs: 12,
      latitude: 19.0180,
      longitude: 72.8450,
      address: 'Dadar TT Circle, Mumbai, Maharashtra',
    },
    {
      label: '🏛️ DL (Delhi): AIIMS Ring Road Trauma',
      chiefComplaint: 'Severe multi-vehicle rollover on Ring Road near Safdarjung, unconscious passenger',
      symptoms: 'unconscious, severe head injury, blunt chest trauma',
      conscious: false,
      breathing: true,
      severeBleeding: true,
      heartRate: 150,
      spo2: 88,
      systolicBp: 75,
      gcs: 6,
      latitude: 28.5700,
      longitude: 77.2100,
      address: 'Ring Road Flyover, New Delhi',
    },
    {
      label: '💔 KA (Bengaluru): MG Road STEMI Attack',
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
      address: 'MG Road Junction, Central District, Bengaluru',
    },
    {
      label: '🌴 KL (Kochi): Marine Drive Acute Stroke',
      chiefComplaint: 'Sudden right-sided facial drooping, complete arm paralysis, unable to speak clearly',
      symptoms: 'face droop, arm weakness, slurred speech, sudden confusion',
      conscious: true,
      breathing: true,
      severeBleeding: false,
      heartRate: 98,
      spo2: 96,
      systolicBp: 175,
      gcs: 13,
      latitude: 9.9800,
      longitude: 76.2750,
      address: 'Shanmugham Road, Marine Drive, Kochi, Kerala',
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
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('incident:created', (newInc) => {
      SoundFX.playDispatchChime();
      setIncidents((prev) => [newInc, ...prev]);
      setSelectedIncident(newInc);
    });

    socket.on('ambulance:position_updated', (data) => {
      if (data.status === 'Arrived_Hospital') {
        SoundFX.playHospitalArrivalChime();
      }
      setAmbulances((prev) =>
        prev.map((a) =>
          (a.id || a._id).toString() === data.ambulanceId.toString()
            ? {
                ...a,
                location: {
                  ...a.location,
                  latitude: data.latitude,
                  longitude: data.longitude,
                },
                status: data.status,
                routeProgressIndex: data.routeProgressIndex,
                remainingKm: data.remainingKm,
                etaMinutes: data.etaMinutes,
              }
            : a
        )
      );

      // Keep active incident status in sync live
      setSelectedIncident((curr) => {
        if (
          curr &&
          ((curr.id && curr.id === data.currentIncidentId) ||
            (curr._id && curr._id === data.currentIncidentId) ||
            curr.assignedAmbulance?.ambulanceId === data.ambulanceId)
        ) {
          return {
            ...curr,
            status: data.status,
            assignedAmbulance: {
              ...curr.assignedAmbulance,
              estimatedArrivalMinutes: data.etaMinutes,
            },
          };
        }
        return curr;
      });
    });

    socket.on('incident:status_changed', (updatedInc) => {
      if (updatedInc.status === 'Arrived_Hospital') {
        SoundFX.playHospitalArrivalChime();
      }
      setIncidents((prev) =>
        prev.map((i) =>
          (i.id || i._id || i.incidentCode) === (updatedInc.id || updatedInc._id || updatedInc.incidentCode)
            ? { ...i, ...updatedInc }
            : i
        )
      );
      setSelectedIncident((curr) => {
        if (
          curr &&
          ((curr.id && curr.id === (updatedInc.id || updatedInc._id || updatedInc.incidentCode)) ||
            curr.incidentCode === updatedInc.incidentCode)
        ) {
          return { ...curr, ...updatedInc };
        }
        return curr;
      });
    });

    socket.on('ambulance:dispatched', () => {
      loadData();
    });

    socket.on('ambulance:status_updated', () => {
      loadData();
    });

    socket.on('hospital:bed_updated', () => {
      loadData();
    });

    socket.on('system:reset', () => {
      loadData();
    });

    return () => {
      socket.off('incident:created');
      socket.off('ambulance:position_updated');
      socket.off('incident:status_changed');
      socket.off('ambulance:dispatched');
      socket.off('ambulance:status_updated');
      socket.off('hospital:bed_updated');
      socket.off('system:reset');
    };
  }, [socket]);

  const handleApplyPreset = (preset) => {
    if (preset.label.includes('TN')) setSelectedRegionId('TN');
    else if (preset.label.includes('KA')) setSelectedRegionId('KA');
    else if (preset.label.includes('MH')) setSelectedRegionId('MH');
    else if (preset.label.includes('DL')) setSelectedRegionId('DL');
    else if (preset.label.includes('KL')) setSelectedRegionId('KL');
    else if (preset.label.includes('TS')) setSelectedRegionId('TS');

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
        SoundFX.playDispatchChime();
        setShowNewEmergencyModal(false);
        setSelectedIncident(result.data);
        showToast(`Emergency ${result.data.incidentCode} triaged as ESI-${result.data.triage?.esiLevel || 2}!`, 'success', 'Emergency Logged');
        await loadData();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error', 'Dispatch Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleGreenCorridor = async (incId) => {
    try {
      const res = await EmergencyAPI.toggleGreenCorridor(incId);
      setSelectedIncident(res.data);
      await loadData();
      showToast('Smart Traffic Signals preempted to Green Wave along emergency route.', 'success', 'Green Corridor Activated');
    } catch (err) {
      showToast(err.message, 'error', 'Green Corridor Error');
    }
  };

  const handleTriggerReroute = async (ambulanceId = null) => {
    try {
      let targetAmbId = ambulanceId;
      if (!targetAmbId && selectedIncident?.assignedAmbulance?.ambulanceId) {
        targetAmbId = selectedIncident.assignedAmbulance.ambulanceId;
      }
      if (!targetAmbId && selectedIncident && selectedIncident.status === 'Reported') {
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
        SoundFX.playSirenChirp();
        const res = await EmergencyAPI.triggerTrafficSpike(targetAmbId);
        showToast(
          res.rerouteDetails?.rerouteReason || 'Corridor traffic spike detected. Calculated dynamic bypass detour!',
          'warning',
          'Dynamic Reroute Triggered'
        );
        await loadData();
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error', 'Reroute Simulation Error');
    }
  };

  const handleResetDemoData = async () => {
    try {
      await EmergencyAPI.resetSystemData();
      showToast('All active missions & ambulances reset to clean sector seed data', 'success', 'Demo Reset Completed');
      await loadData();
    } catch (err) {
      showToast(err.message, 'error', 'Reset Error');
    }
  };

  const handleFastAdmit = async () => {
    if (!selectedIncident) return;
    try {
      SoundFX.playArrivalChime();
      const incId = selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode;
      await EmergencyAPI.updateIncidentStatus(
        incId,
        'Arrived_Hospital',
        'Patient fast-admitted to hospital emergency trauma bay'
      );
      showToast(
        `Ambulance delivered patient safely to ${selectedIncident.targetHospital?.name || 'Hospital Trauma Bay'}!`,
        'success',
        '✅ Patient Safe & Admitted'
      );
      await loadData();
    } catch (err) {
      showToast(err.message, 'error', 'Admission Error');
    }
  };

  const handleAutoDispatch = async (incId) => {
    try {
      SoundFX.playDispatchChime();
      const res = await EmergencyAPI.autoDispatch(incId);
      setSelectedIncident(res.data);
      await loadData();
      showToast(
        `Dispatched ${res.ambulance?.call_sign || 'Ambulance'} to emergency. Destination: ${res.hospital?.name || 'Hospital'}`,
        'success',
        'Auto-Dispatch Completed'
      );
    } catch (err) {
      showToast(err.message, 'error', 'Auto-Dispatch Error');
    }
  };

  const handleSimulateMultiCallConflict = async () => {
    try {
      SoundFX.playDispatchChime();
      showToast('Simulating 2 simultaneous high-priority calls in neighboring sectors...', 'warning', 'Multi-Call Conflict Injected');
      
      // Call 1: STEMI
      const call1 = await EmergencyAPI.createEmergency({
        callerName: 'Bystander 1 (T.Nagar)',
        callerPhone: '+91-98840-11111',
        source: 'Simulated_Conflict_1',
        location: { latitude: 13.0418, longitude: 80.2341, address: 'Usman Road, T.Nagar, Chennai' },
        chiefComplaint: 'Acute STEMI heart attack, severe chest pain radiating to left arm, cold sweat',
        symptoms: ['crushing chest pain', 'shortness of breath', 'cold sweat'],
        conscious: true,
        breathing: true,
        severeBleeding: false,
        casualtyCount: 1,
        vitals: { heartRate: 130, spo2: 91, systolicBp: 86, gcs: 14 },
      });

      // Call 2: Trauma Crash
      const call2 = await EmergencyAPI.createEmergency({
        callerName: 'Traffic Police Patrol',
        callerPhone: '+91-98840-22222',
        source: 'Simulated_Conflict_2',
        location: { latitude: 12.9750, longitude: 80.2500, address: 'OMR IT Corridor, Chennai' },
        chiefComplaint: 'Motorcycle rollover crash, arterial leg laceration, heavy bleeding',
        symptoms: ['massive bleeding', 'open fracture', 'hypotension'],
        conscious: true,
        breathing: true,
        severeBleeding: true,
        casualtyCount: 1,
        vitals: { heartRate: 140, spo2: 93, systolicBp: 90, gcs: 13 },
      });

      setSelectedIncident(call1.data);
      await loadData();
      showToast(
        `Multi-Ambulance Conflict Resolved: ${call1.data.assignedAmbulance?.callSign || 'ALS Unit'} -> STEMI, ${call2.data.assignedAmbulance?.callSign || 'Trauma Unit'} -> OMR Crash!`,
        'success',
        'Multi-Call Allocation Optimal'
      );
    } catch (err) {
      showToast(err.message, 'error', 'Conflict Simulation Error');
    }
  };

  const availableAmbulances = ambulances.filter((a) => a.status === 'Available');
  const enRouteAmbulances = ambulances.filter((a) => a.status !== 'Available');
  const filteredIncidents = incidents.filter((i) => {
    if (queueFilter === 'critical') {
      return (i.triage?.esiLevel || 3) <= 2;
    }
    if (queueFilter === 'enroute') {
      return i.status === 'En_Route_Scene' || i.status === 'En_Route_Hospital' || i.status === 'On_Scene';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Modern Non-Blocking In-App Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-[99999] max-w-sm w-full bg-slate-900/95 border border-slate-700 shadow-2xl rounded-2xl p-4 backdrop-blur-md flex items-start space-x-3 animate-fade-in">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            toast.type === 'warning' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
            toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
            'bg-rose-500/20 text-rose-400 border border-rose-500/30'
          }`}>
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white">{toast.title || 'System Notification'}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

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
        
        {/* Map View (7 cols or Fixed Full Screen Mode when Full Map) */}
        <div className={`${
          isFullMap
            ? 'fixed inset-0 z-[1000] bg-slate-950 p-3 flex flex-col space-y-2'
            : 'lg:col-span-7 flex flex-col space-y-3'
        } transition-all duration-300`}>
          
          {/* Golden Hour Survival Protocol Banner */}
          {selectedIncident && selectedIncident.status !== 'Resolved' && (selectedIncident.triage?.esiLevel || 2) <= 2 && (
            <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-red-950/80 border border-red-500/50 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-lg animate-fade-in">
              <div className="flex items-center space-x-2.5">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                      🚨 Golden Hour Protocol Active
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-black bg-red-600 text-white">
                      ESI {selectedIncident.triage?.esiLevel || 1}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {selectedIncident.incidentCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {selectedIncident.targetHospital?.name
                      ? `Critical Cath Lab / ER Bay allocated at ${selectedIncident.targetHospital.name}. Transit priority locked.`
                      : 'Immediate ambulance match & hospital cath lab allocation required within 60-minute window.'}
                  </p>
                </div>
              </div>
              <div className="bg-slate-950/80 border border-red-500/30 px-2.5 py-1 rounded-lg text-right">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Time in Golden Window</div>
                <div className="text-xs font-black text-amber-400 font-mono">
                  ⏱️ 41m 20s Left
                </div>
              </div>
            </div>
          )}

          {/* CAD Live Radar Header */}
          <div className="flex flex-wrap items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl shadow-lg gap-2.5 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-black text-xs text-white uppercase tracking-wider">CAD LIVE RADAR</span>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 hidden sm:inline">
                {selectedRegionId} Sector Active
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={handleResetDemoData}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-amber-300 border border-slate-700 transition flex items-center space-x-1 shadow-sm"
                title="Reset All Live Data to Clean Initial State (Clears stale dispatches)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold hidden md:inline">Reset Fleet</span>
              </button>
              <button
                onClick={handleSimulateMultiCallConflict}
                className="px-3 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-bold transition shadow-md shadow-purple-600/20 border border-purple-500/40 flex items-center space-x-1.5"
                title="Simulate 2 Simultaneous Emergencies & Multi-Ambulance Reallocation"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Conflict Test</span>
              </button>
              <button
                onClick={() => setShowNewEmergencyModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black transition shadow-lg shadow-red-600/30 flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">+ Intake Call</span>
              </button>
              <button
                onClick={() => setIsFullMap(!isFullMap)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition shadow-md ${
                  isFullMap
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 ring-2 ring-amber-400'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                }`}
                title={isFullMap ? "Exit Full Map View" : "Expand to Full Map View"}
              >
                {isFullMap ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">{isFullMap ? 'Exit Full' : 'Full Map'}</span>
              </button>
            </div>
          </div>

          <div className={`${isFullMap ? 'flex-1 w-full min-h-0' : 'h-[520px]'} rounded-xl overflow-hidden transition-all duration-300`}>
            <EmergencyMap
              ambulances={ambulances}
              hospitals={hospitals}
              incidents={incidents}
              activeIncident={selectedIncident}
              selectedRegionId={selectedRegionId}
              onRegionChange={(reg) => setSelectedRegionId(reg.id)}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                setCadPanelTab('detail');
              }}
              isFullMap={isFullMap}
              onToggleFullMap={() => setIsFullMap(!isFullMap)}
            />
          </div>
        </div>

        {/* Dispatch Queue & Selected Incident Detail */}
        <div className={`${isFullMap ? 'lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4' : 'lg:col-span-5 flex flex-col space-y-4'}`}>
          
          {/* Segmented Tab Navigation Controller */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-xl backdrop-blur-sm flex items-center justify-between gap-1.5">
            <div className="flex items-center space-x-1.5 flex-1">
              <button
                type="button"
                onClick={() => setCadPanelTab('queue')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  cadPanelTab === 'queue'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Live Queue</span>
                <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                  cadPanelTab === 'queue' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  {incidents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCadPanelTab('detail')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  cadPanelTab === 'detail'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Mission Console</span>
                {selectedIncident && (
                  <span className="hidden sm:inline font-mono text-[10px] text-blue-200">
                    {selectedIncident.incidentCode}
                  </span>
                )}
              </button>
            </div>

            {/* Split Dual-Pane View Switcher */}
            <button
              type="button"
              onClick={() => setCadPanelTab(cadPanelTab === 'split' ? 'detail' : 'split')}
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition hidden sm:flex items-center space-x-1 border ${
                cadPanelTab === 'split'
                  ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 ring-1 ring-cyan-500/30'
                  : 'text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
              title="Toggle Split Dual-Pane View"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="text-[10px]">{cadPanelTab === 'split' ? 'Split Active' : 'Split'}</span>
            </button>
          </div>

          {/* Active Incidents Queue (Visible if tab is 'queue' or 'split') */}
          {(cadPanelTab === 'queue' || cadPanelTab === 'split') && (
            <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-sm flex flex-col ${cadPanelTab === 'queue' ? 'min-h-[520px]' : ''}`}>
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 mb-3 gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs text-white uppercase tracking-wider">
                    Emergency Dispatch Queue ({filteredIncidents.length})
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setQueueFilter('all')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition ${queueFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      All ({incidents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueueFilter('critical')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition ${queueFilter === 'critical' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'}`}
                    >
                      Critical ESI-1/2
                    </button>
                    <button
                      type="button"
                      onClick={() => setQueueFilter('enroute')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition ${queueFilter === 'enroute' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-blue-400'}`}
                    >
                      En Route
                    </button>
                  </div>
                  <button
                    onClick={onOpenSOS}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 underline whitespace-nowrap pl-1"
                  >
                    SOS Mode &rarr;
                  </button>
                </div>
              </div>

              {/* Scrollable Incident Cards List */}
              <div className={`space-y-3 overflow-y-auto pr-1.5 flex-1 ${cadPanelTab === 'queue' ? 'max-h-[520px]' : 'max-h-72'}`}>
                {filteredIncidents.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
                    No emergency incidents matching this filter.
                  </div>
                ) : (
                  filteredIncidents.map((inc) => {
                    const isSelected = selectedIncident?.incidentCode === inc.incidentCode;
                    const esi = inc.triage?.esiLevel || 3;
                    const esiBorder = esi === 1 ? 'border-red-500/60' : esi === 2 ? 'border-orange-500/50' : 'border-yellow-500/50';
                    const esiBg = esi === 1 ? 'bg-red-950/20' : esi === 2 ? 'bg-orange-950/20' : 'bg-yellow-950/10';

                    return (
                      <div
                        key={inc.incidentCode}
                        onClick={() => {
                          setSelectedIncident(inc);
                          if (cadPanelTab === 'queue') setCadPanelTab('detail');
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-md space-y-2.5 ${
                          isSelected
                            ? 'border-cyan-500 bg-slate-800/90 ring-2 ring-cyan-500/40 shadow-cyan-500/10'
                            : `${esiBorder} ${esiBg} hover:bg-slate-800/60 hover:border-slate-600`
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black text-white ${
                              esi === 1 ? 'bg-red-600' : esi === 2 ? 'bg-orange-600' : 'bg-yellow-600'
                            }`}>
                              ESI {esi}
                            </span>
                            <span className="font-mono text-xs font-black text-white">{inc.incidentCode}</span>
                            <span className="text-[11px] text-slate-400 font-medium">({inc.triage?.categoryName || 'General Emergency'})</span>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                            inc.status === 'Arrived_Hospital'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : inc.status === 'En_Route_Hospital'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}>
                            {inc.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-semibold leading-snug">{inc.chiefComplaint}</p>
                        
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{inc.location?.address || 'Scene coordinates mapped'}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-1">
                              <Ambulance className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-bold text-cyan-400 text-[11px]">
                                {inc.assignedAmbulance?.callSign || 'Pending'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Hospital className="w-3.5 h-3.5 text-blue-400" />
                              <span className="font-bold text-blue-400 text-[11px] truncate max-w-[140px]">
                                {inc.targetHospital?.name || 'Pending'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedIncident(inc);
                              setCadPanelTab('detail');
                            }}
                            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 group"
                          >
                            <span>Open Console</span>
                            <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Selected Incident Action Console (Visible if tab is 'detail' or 'split') */}
          {(cadPanelTab === 'detail' || cadPanelTab === 'split') && (
            selectedIncident ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm space-y-4">
                
                {/* Header: Incident Identity & Golden Hour Clock */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400">
                      <Radio className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black text-white">{selectedIncident.incidentCode}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black text-white ${
                          (selectedIncident.triage?.esiLevel || 3) <= 2 ? 'bg-red-600' : 'bg-yellow-600'
                        }`}>
                          ESI {selectedIncident.triage?.esiLevel || 2} &bull; {selectedIncident.triage?.categoryName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Status: <span className="text-slate-200 font-semibold">{selectedIncident.status.replace(/_/g, ' ')}</span></p>
                    </div>
                  </div>
                  <div className="text-right bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Golden Hour</span>
                    <span className="text-xs font-black text-amber-400 font-mono">⏱️ 41m Left</span>
                  </div>
                </div>

                {/* Patient Complaint & Location */}
                <div className="text-xs text-slate-200 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block mb-0.5">Chief Complaint</span>
                    <p className="font-semibold text-slate-100">{selectedIncident.chiefComplaint}</p>
                  </div>
                  <div className="flex items-start space-x-2 pt-1 border-t border-slate-800/60">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-300 text-[11px]">{selectedIncident.location?.address || 'GPS Coordinates Recorded'}</span>
                  </div>
                  {selectedIncident.vitals && (
                    <div className="pt-2 border-t border-slate-800/60 grid grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold">HR</span>
                        <span className="font-black text-red-400">{selectedIncident.vitals.heartRate || '--'} bpm</span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold">SpO2</span>
                        <span className="font-black text-cyan-400">{selectedIncident.vitals.spo2 || '--'}%</span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold">BP</span>
                        <span className="font-black text-amber-400">{selectedIncident.vitals.systolicBp || '--'} mmHg</span>
                      </div>
                      <div className="bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-[9px] text-slate-400 block font-semibold">GCS</span>
                        <span className="font-black text-emerald-400">{selectedIncident.vitals.gcs || '--'} / 15</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assigned Ambulance & Hospital Telemetry Hero Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Assigned Unit</span>
                      <Ambulance className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="font-black text-cyan-400 text-sm">
                      {selectedIncident.assignedAmbulance?.callSign || 'Pending Assignment'}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Score: <span className="font-bold text-emerald-400">{selectedIncident.assignedAmbulance?.allocationScore || '92.4'}</span> / 100
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80 space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Target Hospital</span>
                      <Hospital className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="font-black text-blue-400 text-sm truncate">
                      {selectedIncident.targetHospital?.name || 'Pending Assignment'}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Bed Reserved & Cath Lab Ready</span>
                    </div>
                  </div>
                </div>

                {/* Auto-Dispatch CTA if unassigned */}
                {(!selectedIncident.assignedAmbulance?.callSign || selectedIncident.assignedAmbulance?.callSign === 'Pending') && (
                  <button
                    onClick={() => handleAutoDispatch(selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode)}
                    className="w-full py-3 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 animate-pulse"
                  >
                    <Zap className="w-4 h-4" />
                    <span>⚡ Auto-Dispatch Optimal Unit Now (AI Engine)</span>
                  </button>
                )}

                {/* Mission Controls: 2x2 Clean Spacious Action Grid */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  
                  {/* Action 1: Fast Admit */}
                  <button
                    onClick={handleFastAdmit}
                    disabled={selectedIncident.status === 'Arrived_Hospital' || selectedIncident.status === 'Resolved'}
                    className="p-3 rounded-xl text-left bg-gradient-to-br from-emerald-600/90 to-teal-700/90 hover:from-emerald-500 hover:to-teal-600 text-white transition shadow-lg shadow-emerald-600/20 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-400/30 flex flex-col justify-between"
                    title="Fast-Admit Patient Immediately to Hospital Trauma Bay"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-200" />
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/20 text-white uppercase">One-Click</span>
                    </div>
                    <div>
                      <div className="text-xs font-black">
                        {selectedIncident.status === 'Arrived_Hospital' ? '✅ Patient Admitted' : '⚡ Fast Admit Patient'}
                      </div>
                      <div className="text-[10px] text-emerald-100 font-medium">Safe ER Trauma Handoff</div>
                    </div>
                  </button>

                  {/* Action 2: Green Corridor */}
                  <button
                    onClick={() => handleToggleGreenCorridor(selectedIncident.id || selectedIncident._id || selectedIncident.incidentCode)}
                    className={`p-3 rounded-xl text-left transition shadow-lg border flex flex-col justify-between ${
                      selectedIncident.greenCorridorActive
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400 shadow-cyan-600/30'
                        : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700 shadow-slate-900/50'
                    }`}
                    title="Toggle Traffic Signal Preemption Wave"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Zap className={`w-4 h-4 ${selectedIncident.greenCorridorActive ? 'text-white fill-white' : 'text-cyan-400'}`} />
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-300 uppercase">Signals</span>
                    </div>
                    <div>
                      <div className="text-xs font-black">
                        {selectedIncident.greenCorridorActive ? '🚦 Corridor Active' : '🚦 Green Corridor'}
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium">Traffic Light Preemption</div>
                    </div>
                  </button>

                  {/* Action 3: Traffic Spike / Detour */}
                  <button
                    onClick={() => handleTriggerReroute(selectedIncident.assignedAmbulance?.ambulanceId)}
                    className="p-3 rounded-xl text-left bg-slate-800/90 hover:bg-amber-600/90 text-slate-200 hover:text-white transition shadow-lg border border-slate-700 hover:border-amber-500/40 flex flex-col justify-between group"
                    title="Simulate Corridor Traffic Jam & Dynamic Detour"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Navigation className="w-4 h-4 text-amber-400 group-hover:text-white" />
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-300 uppercase">Reroute</span>
                    </div>
                    <div>
                      <div className="text-xs font-black">Dynamic Detour</div>
                      <div className="text-[10px] text-slate-400 group-hover:text-white/80 font-medium">Simulate Traffic Jam</div>
                    </div>
                  </button>

                  {/* Action 4: Explainable AI Audit */}
                  <button
                    onClick={() => setShowXAIDialog(!showXAIDialog)}
                    className={`p-3 rounded-xl text-left transition shadow-lg border flex flex-col justify-between ${
                      showXAIDialog
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/30'
                        : 'bg-slate-800/90 hover:bg-indigo-950/60 text-slate-200 hover:text-indigo-200 border-slate-700 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-900/60 text-slate-300 uppercase">Audit</span>
                    </div>
                    <div>
                      <div className="text-xs font-black">{showXAIDialog ? 'Hide XAI Audit' : 'XAI Rationale'}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Explainable AI Breakdown</div>
                    </div>
                  </button>

                </div>

              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 min-h-[360px]">
                <Radio className="w-8 h-8 text-slate-600 animate-pulse" />
                <p className="font-semibold text-slate-300">No emergency incident selected.</p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Select an incident from the Live Queue tab to view telemetry, inspect routes, and dispatch vehicles.
                </p>
                <button
                  type="button"
                  onClick={() => setCadPanelTab('queue')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md"
                >
                  View Active Queue ({incidents.length})
                </button>
              </div>
            )
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
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
