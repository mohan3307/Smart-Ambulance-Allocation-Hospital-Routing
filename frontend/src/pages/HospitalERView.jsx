import React, { useState, useEffect } from 'react';
import { 
  Hospital as HospIcon, 
  Bed, 
  AlertTriangle, 
  Clock, 
  Ambulance, 
  CheckCircle2, 
  ShieldAlert, 
  Activity, 
  Heart, 
  Save, 
  RefreshCw,
  BellRing
} from 'lucide-react';
import { EmergencyAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';

export const HospitalERView = () => {
  const { socket } = useSocket();
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [bayNotification, setBayNotification] = useState('');

  // Editable bed form
  const [erAvailable, setErAvailable] = useState(5);
  const [icuAvailable, setIcuAvailable] = useState(2);
  const [diversion, setDiversion] = useState(false);

  const loadData = async () => {
    try {
      const [hospRes, incRes] = await Promise.all([
        EmergencyAPI.getHospitals(),
        EmergencyAPI.getIncidents(),
      ]);
      const hosps = hospRes.data || [];
      setHospitals(hosps);
      setIncidents(incRes.data || []);

      if (hosps.length > 0 && !selectedHospitalId) {
        const first = hosps[0];
        setSelectedHospitalId(first.id || first._id);
        setErAvailable(first.erBedsAvailable);
        setIcuAvailable(first.icuBedsAvailable);
        setDiversion(first.diversionStatus);
      }
    } catch (err) {
      console.error('Error loading hospital ER data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentHospital = hospitals.find(
    (h) => (h.id || h._id).toString() === selectedHospitalId.toString()
  );

  const handleSelectHospital = (hosp) => {
    setSelectedHospitalId(hosp.id || hosp._id);
    setErAvailable(hosp.erBedsAvailable);
    setIcuAvailable(hosp.icuBedsAvailable);
    setDiversion(hosp.diversionStatus);
  };

  const handleSaveBedChanges = async () => {
    setIsUpdating(true);
    try {
      await EmergencyAPI.updateHospitalBeds(selectedHospitalId, {
        erBedsAvailable: parseInt(erAvailable),
        icuBedsAvailable: parseInt(icuAvailable),
        diversionStatus: diversion,
      });
      await loadData();
      alert('Hospital bed capacity updated! Central AI allocator synchronized.');
    } catch (err) {
      alert('Error updating beds: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrepareBay = async (bayName, incidentCode) => {
    try {
      await EmergencyAPI.prepareBay(selectedHospitalId, bayName, incidentCode);
      setBayNotification(`Confirmed: ${bayName} prepared and staffed for ${incidentCode}!`);
      setTimeout(() => setBayNotification(''), 6000);
    } catch (err) {
      alert('Error preparing bay: ' + err.message);
    }
  };

  // Find incoming incidents routed to this hospital
  const incomingIncidents = incidents.filter(
    (i) =>
      i.status !== 'Resolved' &&
      (i.targetHospital?.hospitalId === selectedHospitalId ||
        i.targetHospital?.name === currentHospital?.name)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header & Hospital Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HospIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">Emergency Department Intake Console</h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Hospital Node
              </span>
            </div>
            <p className="text-xs text-slate-400">Pre-arrival trauma/cardiac alerts, live telemetry & bed synchronization</p>
          </div>
        </div>

        {/* Hospital Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-bold text-slate-400">Select Facility:</label>
          <select
            value={selectedHospitalId}
            onChange={(e) => {
              const h = hospitals.find((item) => (item.id || item._id) === e.target.value);
              if (h) handleSelectHospital(h);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {hospitals.map((h) => (
              <option key={h.id || h._id} value={h.id || h._id}>
                {h.name} {h.diversionStatus ? '(DIVERSION)' : ''}
              </option>
            ))}
          </select>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bay Notification Toast */}
      {bayNotification && (
        <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-xl p-3 flex items-center space-x-3 text-emerald-300 text-xs font-bold shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{bayNotification}</span>
        </div>
      )}

      {/* Main Grid: Bed Capacity Manager (Left) + Incoming Ambulance Ticker (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bed Capacity Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Bed className="w-4 h-4 text-blue-400" />
                <span>Live Bed Capacity Manager</span>
              </span>
              <span className="text-[10px] text-slate-400">Instant Sync</span>
            </div>

            {/* Hospital Overview */}
            <div className="space-y-1 text-xs">
              <div className="font-bold text-white text-sm">{currentHospital?.name}</div>
              <div className="text-slate-400">{currentHospital?.type}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentHospital?.location?.address}</div>
            </div>

            {/* ER Beds Available Input */}
            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">ER Beds Available:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {erAvailable} / {currentHospital?.erBedsTotal || 30}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={currentHospital?.erBedsTotal || 30}
                value={erAvailable}
                onChange={(e) => setErAvailable(e.target.value)}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* ICU Beds Available Input */}
            <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Critical ICU Beds:</span>
                <span className={`font-bold font-mono text-sm ${icuAvailable > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {icuAvailable} / {currentHospital?.icuBedsTotal || 16}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max={currentHospital?.icuBedsTotal || 16}
                value={icuAvailable}
                onChange={(e) => setIcuAvailable(e.target.value)}
                className="w-full accent-cyan-500"
              />
              {icuAvailable === 0 && (
                <div className="text-[10px] text-red-400 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>0 ICU beds will trigger allocation diversion penalty!</span>
                </div>
              )}
            </div>

            {/* Diversion Status Toggle */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Emergency Diversion Status</span>
                <button
                  type="button"
                  onClick={() => setDiversion(!diversion)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    diversion
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {diversion ? 'DIVERSION ACTIVE' : 'Normal Operations'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                When Diversion is active, regional AI routing automatically reroutes inbound critical cases to neighboring facilities to prevent hallway waits.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveBedChanges}
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>{isUpdating ? 'Broadcasting...' : 'Update & Broadcast Bed Status'}</span>
            </button>

          </div>

          {/* Active Facility Capabilities */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Active Clinical Facilities</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(currentHospital?.activeFacilities || []).map((fac, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                  {fac.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Incoming Patients Pre-Arrival Ticker (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <BellRing className="w-5 h-5 text-red-400 animate-bounce" />
                <h3 className="text-base font-black text-white">
                  Inbound Ambulance Pre-Arrival Monitor ({incomingIncidents.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Real-Time Telemetry Feed</span>
            </div>

            {incomingIncidents.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-sm font-bold text-slate-200">No Inbound Ambulances Currently</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  All active patients have been received or are currently routed to other regional hospital nodes.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {incomingIncidents.map((inc) => {
                  const esi = inc.triage?.esiLevel || 2;
                  const eta = inc.targetHospital?.estimatedArrivalMinutes || 6.5;

                  return (
                    <div
                      key={inc.incidentCode}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3 relative overflow-hidden"
                    >
                      {/* Left color bar */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                        esi === 1 ? 'bg-red-500' : esi === 2 ? 'bg-orange-500' : 'bg-yellow-500'
                      }`} />

                      {/* Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pl-2">
                        <div className="flex items-center space-x-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-black text-white ${
                            esi === 1 ? 'bg-red-600' : esi === 2 ? 'bg-orange-600' : 'bg-yellow-600'
                          }`}>
                            ESI {esi} &bull; {inc.triage?.categoryName?.split(' ')[0]}
                          </span>
                          <span className="font-mono text-sm font-bold text-white">{inc.incidentCode}</span>
                        </div>

                        {/* ETA Countdown */}
                        <div className="flex items-center space-x-2 bg-slate-800/90 px-3 py-1 rounded-xl border border-slate-700">
                          <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                          <span className="text-xs text-slate-400">ETA:</span>
                          <span className="font-black text-white font-mono text-sm">{eta} mins</span>
                        </div>
                      </div>

                      {/* Chief Complaint */}
                      <p className="text-xs font-semibold text-slate-200 pl-2">
                        {inc.chiefComplaint}
                      </p>

                      {/* Live Vitals Preview */}
                      {inc.vitals && (
                        <div className="pl-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px]">Heart Rate</span>
                            <div className="font-bold text-red-400 flex items-center space-x-1">
                              <Heart className="w-3 h-3 inline" />
                              <span>{inc.vitals.heartRate || '--'} bpm</span>
                            </div>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px]">SpO2 Saturation</span>
                            <div className="font-bold text-cyan-400">{inc.vitals.spo2 || '--'}%</div>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px]">Blood Pressure</span>
                            <div className="font-bold text-amber-400">{inc.vitals.systolicBp || '--'} mmHg</div>
                          </div>
                          <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                            <span className="text-slate-400 text-[10px]">GCS Score</span>
                            <div className="font-bold text-white">{inc.vitals.gcs || '--'} / 15</div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons to prepare bays */}
                      <div className="pl-2 pt-1 flex flex-wrap gap-2">
                        <button
                          onClick={() => handlePrepareBay('Trauma Resuscitation Bay 1', inc.incidentCode)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-500 text-white shadow"
                        >
                          Prepare Trauma Bay 1
                        </button>
                        <button
                          onClick={() => handlePrepareBay('Cardiac Cath Lab 1 (Pre-Alert)', inc.incidentCode)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600/80 hover:bg-amber-500 text-white shadow"
                        >
                          Activate STEMI / Cath Bay
                        </button>
                        <button
                          onClick={() => handlePrepareBay('CT Neuro-Scan Suite', inc.incidentCode)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600/80 hover:bg-purple-500 text-white shadow"
                        >
                          Clear CT Scanner for Stroke
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
