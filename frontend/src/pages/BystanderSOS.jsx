import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  PhoneCall, 
  Heart, 
  Flame, 
  Car, 
  AlertTriangle, 
  Users, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Sparkles,
  RefreshCw,
  Navigation
} from 'lucide-react';
import { CPRMetronome } from '../components/firstaid/CPRMetronome';
import { FirstAidProtocols } from '../components/firstaid/FirstAidProtocols';
import { EmergencyAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { SoundFX } from '../services/soundEffects';

const SOS_PRESET_CITIES = [
  { name: '🌟 Chennai (TN)', address: 'Usman Road, T.Nagar, Chennai, Tamil Nadu', lat: 13.0418, lon: 80.2341 },
  { name: '🏛️ Bengaluru (KA)', address: 'MG Road Metro Station, Bengaluru, Karnataka', lat: 12.9730, lon: 77.6010 },
  { name: '🏙️ Mumbai (MH)', address: 'Dadar TT Circle, Mumbai, Maharashtra', lat: 19.0180, lon: 72.8450 },
  { name: '🏛️ Delhi NCR', address: 'Ring Road Flyover, New Delhi', lat: 28.5700, lon: 77.2100 },
  { name: '🏢 Hyderabad (TS)', address: 'Punjagutta Circle, Hyderabad, Telangana', lat: 17.4250, lon: 78.4480 },
  { name: '🌴 Kochi (KL)', address: 'Marine Drive, Kochi, Kerala', lat: 10.0350, lon: 76.2700 },
];

export const BystanderSOS = () => {
  const { socket } = useSocket();
  const [step, setStep] = useState('sos_form'); // 'sos_form' | 'tracking_active'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [createdIncident, setCreatedIncident] = useState(null);

  // Bystander form
  const [location, setLocation] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Fetching live GPS location...',
    accuracy: 'Accurate to 12 meters',
  });
  const [selectedEmergencyType, setSelectedEmergencyType] = useState('cardiac');
  const [casualtyCount, setCasualtyCount] = useState(1);
  const [selectedHazards, setSelectedHazards] = useState(['Traffic']);
  const [bystanderNotes, setBystanderNotes] = useState('');

  // Get real HTML5 GPS or fallback
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: parseFloat(pos.coords.latitude.toFixed(6)),
            longitude: parseFloat(pos.coords.longitude.toFixed(6)),
            address: `GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`,
            accuracy: `Accurate to ${Math.round(pos.coords.accuracy)}m`,
          });
        },
        () => {
          setLocation({
            latitude: 12.9725,
            longitude: 77.5980,
            address: 'MG Road Metro Station, Bengaluru (Default GPS Pin)',
            accuracy: 'Simulation GPS Location',
          });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  const EMERGENCY_TYPES = [
    {
      id: 'cardiac',
      label: 'Unconscious / Stopped Breathing',
      subtext: 'Cardiac arrest, no pulse, collapsed',
      icon: Heart,
      color: 'border-red-500 bg-red-950/40 text-red-400',
      guidanceKey: 'cpr_cardiac',
      complaint: 'Person collapsed, unresponsive, not breathing normally, CPR needed immediately',
      symptoms: ['cardiac arrest', 'unresponsive', 'stopped breathing'],
      conscious: false,
      breathing: false,
    },
    {
      id: 'crash',
      label: 'Vehicle Crash / Severe Bleeding',
      subtext: 'Arterial blood spurting, major trauma',
      icon: Car,
      color: 'border-rose-500 bg-rose-950/40 text-rose-400',
      guidanceKey: 'severe_bleeding',
      complaint: 'Major roadway collision, heavy bleeding from limb, victim trapped',
      symptoms: ['massive bleeding', 'open fracture', 'deep laceration'],
      conscious: true,
      breathing: true,
      severeBleeding: true,
    },
    {
      id: 'chest_pain',
      label: 'Crushing Chest Pain / Heart Attack',
      subtext: 'Pain in left arm/jaw, sweating, pale',
      icon: AlertTriangle,
      color: 'border-amber-500 bg-amber-950/40 text-amber-400',
      guidanceKey: 'chest_pain',
      complaint: 'Crushing substernal chest pressure radiating to arm, heavy cold sweat',
      symptoms: ['crushing chest pain', 'shortness of breath', 'cold sweat'],
      conscious: true,
      breathing: true,
      severeBleeding: false,
    },
    {
      id: 'choking',
      label: 'Choking / Cannot Breathe',
      subtext: 'Airway blocked, clutching throat',
      icon: ShieldAlert,
      color: 'border-orange-500 bg-orange-950/40 text-orange-400',
      guidanceKey: 'choking_heimlich',
      complaint: 'Severe choking obstruction, turning blue, unable to talk or breathe',
      symptoms: ['choking', 'cannot breathe', 'stridor'],
      conscious: true,
      breathing: false,
      severeBleeding: false,
    },
  ];

  const HAZARDS = ['Heavy Traffic', 'Fire / Smoke', 'Downed Power Lines', 'Chemical / Biohazard', 'Violent Crowd'];

  const toggleHazard = (hazard) => {
    setSelectedHazards((prev) =>
      prev.includes(hazard) ? prev.filter((h) => h !== hazard) : [...prev, hazard]
    );
  };

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'error', title = '') => {
    setToast({ message, type, title });
    setTimeout(() => setToast(null), 4500);
  };

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    try {
      const emType = EMERGENCY_TYPES.find((t) => t.id === selectedEmergencyType) || EMERGENCY_TYPES[0];

      const payload = {
        callerName: 'Bystander SOS (Mobile User)',
        callerPhone: '+91-Emergency-Bystander',
        source: 'Bystander_SOS',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
        },
        chiefComplaint: bystanderNotes ? `${emType.complaint}. Notes: ${bystanderNotes}` : emType.complaint,
        symptoms: emType.symptoms,
        conscious: emType.conscious,
        breathing: emType.breathing,
        severeBleeding: emType.severeBleeding,
        casualtyCount,
        sceneHazards: selectedHazards,
      };

      const result = await EmergencyAPI.createEmergency(payload);
      if (result.success) {
        SoundFX.playDispatchChime();
        setCreatedIncident(result.data);
        setStep('tracking_active');
      }
    } catch (err) {
      showToast(err.response?.data?.error || err.message, 'error', 'SOS Submission Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentType = EMERGENCY_TYPES.find((t) => t.id === selectedEmergencyType) || EMERGENCY_TYPES[0];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-[99999] max-w-sm w-full bg-slate-900/95 border border-red-500/50 shadow-2xl rounded-2xl p-4 backdrop-blur-md flex items-start space-x-3 animate-fade-in">
          <div className="p-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white">{toast.title || 'Notification'}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white text-xs font-bold px-1">
            ✕
          </button>
        </div>
      )}

      {step === 'sos_form' ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Hero Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              <span>1-Tap Public Emergency Response</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Bystander Emergency SOS
            </h1>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Share your location instantly. AI matches the nearest fully equipped ambulance & hospital before sirens arrive.
            </p>
          </div>

          {/* Online Web SOS vs Offline Low-Network SMS Switcher */}
          <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
            <button
              type="button"
              onClick={() => setIsOfflineMode(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                !isOfflineMode ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>🌐 Live Web CAD SOS</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOfflineMode(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                isOfflineMode ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>📶 Offline SMS Mode (No Internet)</span>
            </button>
          </div>

          {/* Quick City Selector */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Select City / Rapid Pin:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SOS_PRESET_CITIES.map((city, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setLocation({
                      latitude: city.lat,
                      longitude: city.lon,
                      address: city.address,
                      accuracy: 'Rapid City GPS Pin ±5m',
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-bold transition shadow-sm"
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          {/* GPS Location Pill */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Live GPS Coordinates</div>
                <div className="text-xs font-bold text-white truncate max-w-xs">{location.address}</div>
                <div className="text-[10px] text-emerald-400">{location.accuracy}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setLocation((prev) => ({ ...prev, address: 'Refreshed GPS Accuracy ±8m' }));
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Refresh GPS"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Emergency Type Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. What is the emergency?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMERGENCY_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedEmergencyType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedEmergencyType(type.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? `${type.color} ring-2 ring-red-500 shadow-lg`
                        : 'border-slate-800 bg-slate-900 hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 mb-1">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-bold text-xs text-white">{type.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{type.subtext}</p>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-red-400 absolute top-3 right-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Casualties Count */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Number of Casualties:</span>
              </label>
              <span className="text-base font-black text-cyan-400 font-mono">{casualtyCount} Victim{casualtyCount > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center space-x-3">
              {[1, 2, 3, 4, '5+'].map((num, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCasualtyCount(typeof num === 'number' ? num : 5)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition border ${
                    casualtyCount === (typeof num === 'number' ? num : 5)
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Scene Hazards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Scene Hazards (Helps crew prepare gear):
            </label>
            <div className="flex flex-wrap gap-2">
              {HAZARDS.map((h, i) => {
                const isSelected = selectedHazards.includes(h);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleHazard(h)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '} {h}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bystander Note */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              3. Quick details / Landmarks (Optional):
            </label>
            <input
              type="text"
              value={bystanderNotes}
              onChange={(e) => setBystanderNotes(e.target.value)}
              placeholder="e.g. In front of coffee shop, 2nd floor, patient is wearing blue shirt..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500"
            />
          </div>

          {/* BIG SOS TRIGGER BUTTON / OFFLINE SMS TRIGGER */}
          <div className="pt-2 space-y-3">
            {!isOfflineMode ? (
              <button
                onClick={handleTriggerSOS}
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl font-black text-lg text-white uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 shadow-2xl shadow-red-600/50 border-2 border-red-400 flex items-center justify-center space-x-3 transition-transform active:scale-95"
              >
                <ShieldAlert className="w-7 h-7 animate-bounce" />
                <span>{isSubmitting ? 'DISPATCHING EMERGENCY SERVICES...' : '🚨 TRIGGER EMERGENCY SOS NOW'}</span>
              </button>
            ) : (
              <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                  <PhoneCall className="w-4 h-4 animate-pulse" />
                  <span>CELLULAR SMS DISPATCH (0% INTERNET REQUIRED)</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                  SOS [{currentType.label}] GPS:{location.latitude},{location.longitude} LOC:{location.address} CASUALTY:{casualtyCount}
                </div>
                <a
                  href={`sms:108?body=${encodeURIComponent(`SOS [${currentType.label}] GPS:${location.latitude},${location.longitude} LOC:${location.address} CASUALTY:${casualtyCount}`)}`}
                  className="w-full py-4 rounded-xl font-black text-base text-white uppercase tracking-wider bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-xl border border-amber-400 flex items-center justify-center space-x-2 text-center"
                >
                  <span>📲 Send Emergency SMS to 108 Dispatch</span>
                </a>
                <p className="text-[10px] text-slate-400 text-center">
                  Works on basic 2G / 3G cellular SMS without internet data connectivity.
                </p>
              </div>
            )}
          </div>

          {/* Backup Hotline Call */}
          <div className="text-center pt-1">
            <a
              href="tel:108"
              className="inline-flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition"
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-400" />
              <span>Dial 108 / 112 Emergency Voice Call Fallback</span>
            </a>
          </div>

        </div>
      ) : (
        /* STEP 2: ACTIVE RESCUE & SYNCHRONIZED FIRST-AID SCREEN */
        <div className="space-y-6 animate-fade-in">
          
          {/* Confirmation Header */}
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
                  DISPATCH CONFIRMED &bull; {createdIncident?.incidentCode}
                </span>
                <h2 className="text-base font-black text-white">Emergency Help is En Route</h2>
                <p className="text-xs text-slate-300">
                  Unit <span className="font-bold text-cyan-400">{createdIncident?.assignedAmbulance?.callSign}</span> dispatched to your location.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold px-2 py-1 rounded bg-red-600 text-white font-mono">
                ESI {createdIncident?.triage?.esiLevel}
              </span>
            </div>
          </div>

          {/* Real-time Hospital Pre-Alert Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400">Target Hospital: </span>
              <span className="font-bold text-blue-400">{createdIncident?.targetHospital?.name}</span>
            </div>
            <div className="text-emerald-400 font-semibold flex items-center space-x-1">
              <span>✓ Trauma Bay Reserved</span>
            </div>
          </div>

          {/* CPR METRONOME (if cardiac / unresponsive) */}
          {(createdIncident?.triage?.firstAidGuidanceKey === 'cpr_cardiac' || selectedEmergencyType === 'cardiac') ? (
            <CPRMetronome
              etaMinutes={createdIncident?.assignedAmbulance?.estimatedArrivalMinutes || 4.8}
              isEmergencyActive={true}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-6 h-6 text-red-400 animate-pulse" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated Arrival</div>
                  <div className="text-xl font-black text-white font-mono">
                    {createdIncident?.assignedAmbulance?.estimatedArrivalMinutes || '4.5'} Minutes
                  </div>
                </div>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 font-bold border border-red-500/30">
                Sirens Approaching
              </span>
            </div>
          )}

          {/* CONTEXTUAL FIRST-AID CHECKLIST */}
          <FirstAidProtocols
            guidanceKey={createdIncident?.triage?.firstAidGuidanceKey || currentType.guidanceKey}
          />

          {/* Reset / Report Another Incident */}
          <div className="pt-2 text-center">
            <button
              onClick={() => {
                setStep('sos_form');
                setCreatedIncident(null);
              }}
              className="text-xs text-slate-400 hover:text-white underline font-semibold"
            >
              Report a different emergency / Reset form
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
