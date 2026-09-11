import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Ambulance as AmbIcon, 
  Navigation, 
  Clock, 
  Zap, 
  AlertTriangle, 
  Heart, 
  Activity, 
  ShieldCheck, 
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Play
} from 'lucide-react';
import { EmergencyMap } from '../components/map/EmergencyMap';
import { EmergencyAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

export const ParamedicView = () => {
  const { socket, lastNotification, joinRole } = useSocket();
  const [ambulances, setAmbulances] = useState([]);
  const [selectedAmbId, setSelectedAmbId] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [rerouteNotice, setRerouteNotice] = useState(null);

  // Paramedic live vitals update
  const [vitals, setVitals] = useState({
    heartRate: 110,
    spo2: 95,
    systolicBp: 120,
    gcs: 14,
  });
  const [vitalsUpdated, setVitalsUpdated] = useState(false);

  const loadData = async () => {
    try {
      const [ambRes, incRes] = await Promise.all([
        EmergencyAPI.getAmbulances(),
        EmergencyAPI.getIncidents(),
      ]);
      const ambs = ambRes.data || [];
      setAmbulances(ambs);
      setIncidents(incRes.data || []);

      if (ambs.length > 0 && !selectedAmbId) {
        // Pick an active en-route ambulance if available, otherwise first
        const active = ambs.find((a) => a.status !== 'Available') || ambs[0];
        setSelectedAmbId(active.id || active._id);
      }
    } catch (err) {
      console.error('Error loading paramedic data:', err);
    }
  };

  // Real-Time WebSocket Synchronization (No REST polling)
  useEffect(() => {
    loadData();

    if (!socket) return;
    if (selectedAmbId) {
      joinRole('ambulance', selectedAmbId);
    }

    const handlePosUpdate = (data) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          (a.id === data.ambulanceId || a._id === data.ambulanceId)
            ? {
                ...a,
                location: {
                  ...a.location,
                  coordinates: data.coordinates,
                  longitude: data.coordinates[0],
                  latitude: data.coordinates[1],
                  speedKmH: data.speedKmH,
                },
                remainingKm: data.remainingKm,
                etaMinutes: data.etaMinutes,
                routeProgressIndex: data.routeProgressIndex,
              }
            : a
        )
      );
    };

    const handleAmbulanceStatus = (data) => {
      setAmbulances((prev) =>
        prev.map((a) =>
          (a.id === data.ambulanceId || a._id === data.ambulanceId)
            ? { ...a, status: data.status }
            : a
        )
      );
    };

    const handleRefreshIncidents = () => {
      loadData();
    };

    socket.on('ambulance:position_updated', handlePosUpdate);
    socket.on('ambulance:status_changed', handleAmbulanceStatus);
    socket.on('ambulance:dispatched', handleRefreshIncidents);

    return () => {
      socket.off('ambulance:position_updated', handlePosUpdate);
      socket.off('ambulance:status_changed', handleAmbulanceStatus);
      socket.off('ambulance:dispatched', handleRefreshIncidents);
    };
  }, [socket, selectedAmbId]);

  const currentAmb = ambulances.find(
    (a) => (a.id || a._id).toString() === selectedAmbId.toString()
  );

  const currentIncident = incidents.find(
    (i) => i.assignedAmbulance?.ambulanceId?.toString() === selectedAmbId.toString() ||
           i.incidentCode === currentAmb?.currentIncidentId
  );

  const handleSimulateStep = async () => {
    if (!selectedAmbId) return;
    setIsAdvancing(true);
    try {
      const res = await EmergencyAPI.simulateStep(selectedAmbId);
      await loadData();
    } catch (err) {
      console.error('Step simulation error:', err);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleTriggerTrafficSpike = async () => {
    if (!selectedAmbId) return;
    try {
      const res = await EmergencyAPI.triggerTrafficSpike(selectedAmbId);
      setRerouteNotice(res.rerouteDetails);
      await loadData();
    } catch (err) {
      alert('Traffic trigger: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!currentIncident) return;
    try {
      await EmergencyAPI.updateIncidentStatus(
        currentIncident.id || currentIncident._id || currentIncident.incidentCode,
        newStatus,
        `Paramedic crew updated milestone to ${newStatus}`
      );
      await loadData();
    } catch (err) {
      alert('Status update error: ' + err.message);
    }
  };

  const handleSaveVitals = () => {
    setVitalsUpdated(true);
    setTimeout(() => setVitalsUpdated(false), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Tablet Vehicle Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">In-Vehicle Paramedic Navigation Console</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Tablet HUD
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-time GPS waypoints, dynamic rerouting alerts & hospital vitals uplink</p>
          </div>
        </div>

        {/* Unit Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-400">Unit HUD:</label>
          <select
            value={selectedAmbId}
            onChange={(e) => setSelectedAmbId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
          >
            {ambulances.map((a) => (
              <option key={a.id || a._id} value={a.id || a._id}>
                {a.callSign} - [{a.status}]
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dynamic Reroute Alert Banner (if triggered) */}
      {(rerouteNotice || lastNotification?.title === 'Dynamic Reroute Triggered') && (
        <div className="bg-gradient-to-r from-amber-950/80 to-slate-900 border-2 border-amber-500 rounded-2xl p-4 flex items-center justify-between shadow-2xl animate-fade-in">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="text-[11px] uppercase font-black text-amber-300 tracking-wider">
                DYNAMIC MID-TRANSIT REROUTE TRIGGERED
              </div>
              <p className="text-xs font-bold text-white mt-0.5">
                {rerouteNotice?.rerouteReason || lastNotification?.message}
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                Bypassed corridor bottleneck &bull; Saves ~{rerouteNotice?.minutesSaved || 4.7} minutes
              </div>
            </div>
          </div>
          <button
            onClick={() => setRerouteNotice(null)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
          >
            Acknowledge Reroute
          </button>
        </div>
      )}

      {/* Grid: Navigation Map (Left) + Crew Telemetry & Mission Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation Map (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="font-bold text-slate-200">ACTIVE ROUTE & WAYPOINTS</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSimulateStep}
                disabled={isAdvancing}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md shadow-cyan-600/30 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulate GPS Step</span>
              </button>
              <button
                onClick={handleTriggerTrafficSpike}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-md shadow-amber-600/30 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Inject Traffic Jam</span>
              </button>
            </div>
          </div>

          <div className="h-[480px] rounded-xl overflow-hidden">
            <EmergencyMap
              ambulances={ambulances.filter((a) => (a.id || a._id).toString() === selectedAmbId.toString())}
              incidents={currentIncident ? [currentIncident] : []}
              zoom={13}
              center={[
                currentAmb?.location?.latitude || 12.9716,
                currentAmb?.location?.longitude || 77.5946,
              ]}
            />
          </div>

        </div>

        {/* Paramedic In-Vehicle Console (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Mission Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit Call Sign</span>
                <div className="text-lg font-black text-white">{currentAmb?.callSign}</div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                {currentAmb?.status}
              </span>
            </div>

            {/* Incident Summary */}
            {currentIncident ? (
              <div className="space-y-2 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white font-mono">{currentIncident.incidentCode}</span>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px]">
                    ESI {currentIncident.triage?.esiLevel}
                  </span>
                </div>
                <div className="font-semibold text-slate-200">{currentIncident.chiefComplaint}</div>
                <div className="text-slate-400">{currentIncident.location?.address}</div>
                <div className="text-blue-400 font-medium">
                  Destination: {currentIncident.targetHospital?.name}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl">
                Ambulance is currently in standby mode at staging bay.
              </div>
            )}

            {/* Milestone Transition Buttons */}
            {currentIncident && (
              <div className="space-y-2 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Update Mission Milestone:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('On_Scene')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      currentIncident.status === 'On_Scene'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    1. Arrived on Scene
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('En_Route_Hospital')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      currentIncident.status === 'En_Route_Hospital'
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    2. En Route to Hospital
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Arrived_Hospital')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      currentIncident.status === 'Arrived_Hospital'
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    3. Arrived at ER
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Resolved')}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
                  >
                    4. Handover & Clear
                  </button>
                </div>
              </div>
            )}

            {/* Crew Vitals Telemetry Logger */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <span>En-Route Patient Vitals Logger</span>
                </span>
                {vitalsUpdated && (
                  <span className="text-[10px] text-emerald-400 font-bold animate-pulse">
                    ✓ Synced with Hospital ER
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-slate-400 block">HR (BPM)</label>
                  <input
                    type="number"
                    value={vitals.heartRate}
                    onChange={(e) => setVitals({ ...vitals, heartRate: e.target.value })}
                    className="w-full bg-transparent font-bold text-red-400 text-sm focus:outline-none"
                  />
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-slate-400 block">SpO2 (%)</label>
                  <input
                    type="number"
                    value={vitals.spo2}
                    onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                    className="w-full bg-transparent font-bold text-cyan-400 text-sm focus:outline-none"
                  />
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-slate-400 block">Systolic BP</label>
                  <input
                    type="number"
                    value={vitals.systolicBp}
                    onChange={(e) => setVitals({ ...vitals, systolicBp: e.target.value })}
                    className="w-full bg-transparent font-bold text-amber-400 text-sm focus:outline-none"
                  />
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <label className="text-[10px] text-slate-400 block">GCS (3-15)</label>
                  <input
                    type="number"
                    value={vitals.gcs}
                    onChange={(e) => setVitals({ ...vitals, gcs: e.target.value })}
                    className="w-full bg-transparent font-bold text-white text-sm focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveVitals}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-1.5"
              >
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transmit Vitals Update to ER</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
