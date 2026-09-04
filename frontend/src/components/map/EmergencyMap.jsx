import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Ambulance as AmbIcon, 
  Hospital as HospIcon, 
  AlertTriangle, 
  ShieldAlert, 
  Bed, 
  Flame, 
  Navigation,
  Clock,
  Layers
} from 'lucide-react';

const MAP_LAYERS = {
  google_streets: {
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  google_traffic: {
    name: 'Google Traffic',
    url: 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Live Traffic',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  google_satellite: {
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
  },
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

// Custom SVG DivIcons to ensure reliable rendering across all environments
const createAmbulanceIcon = (ambulance) => {
  const isAvailable = ambulance.status === 'Available';
  const color = isAvailable ? '#10B981' : '#06B6D4'; // Green or Neon Cyan
  const speed = ambulance.location?.speedKmH || ambulance.speedKmH || 48;

  // For active en-route ambulances, show animated sonar radar waves & dual emergency strobe
  const radarWave = !isAvailable
    ? `<div style="position: absolute; width: 68px; height: 68px; top: -14px; left: -14px; border-radius: 50%; border: 2px solid #06B6D4; opacity: 0.8; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
       <div style="position: absolute; width: 88px; height: 88px; top: -24px; left: -24px; border-radius: 50%; background: radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0) 70%); pointer-events: none;"></div>`
    : '';

  const strobeLights = !isAvailable
    ? `<div style="position: absolute; top: -7px; display: flex; gap: 4px; z-index: 20;">
         <div style="width: 7px; height: 7px; background: #EF4444; border-radius: 50%; box-shadow: 0 0 10px #EF4444; animation: pulse 0.5s infinite alternate;"></div>
         <div style="width: 7px; height: 7px; background: #3B82F6; border-radius: 50%; box-shadow: 0 0 10px #3B82F6; animation: pulse 0.5s infinite alternate 0.25s;"></div>
       </div>`
    : '';

  return L.divIcon({
    className: 'custom-amb-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        ${radarWave}
        ${strobeLights}
        <div style="background: ${color}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 4px 18px rgba(0,0,0,0.8); z-index: 10;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14h-4v4h-6v-4H5v-6h4V4h6v4h4v6z"/>
          </svg>
        </div>
        <div style="margin-top: 3px; background: #0F172A; color: white; font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; border: 1.5px solid ${isAvailable ? '#10B981' : '#06B6D4'}; box-shadow: 0 3px 10px rgba(0,0,0,0.8); white-space: nowrap; z-index: 10; display: flex; align-items: center; gap: 4px;">
          <span>${ambulance.callSign.split(' ')[0]}</span>
          ${!isAvailable ? `<span style="color: #38BDF8; font-size: 9px; font-weight: 900;">• ${speed}km/h</span>` : ''}
        </div>
      </div>
    `,
    iconSize: [40, 62],
    iconAnchor: [20, 20],
  });
};

const createDistanceBadgeIcon = (remainingKm, etaMin) => {
  return L.divIcon({
    className: 'custom-dist-badge',
    html: `
      <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #06B6D4; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 5px; white-space: nowrap; pointer-events: none;">
        <span style="color: #38BDF8;">🛣️ ${remainingKm} km</span>
        <span style="color: #64748B;">|</span>
        <span style="color: #34D399;">⏱️ ${etaMin} min</span>
      </div>
    `,
    iconSize: [115, 28],
    iconAnchor: [57, 14],
  });
};

const createHospitalIcon = (hospital) => {
  const isDiverted = hospital.diversionStatus || hospital.icuBedsAvailable === 0;
  const bgColor = isDiverted ? '#EF4444' : '#3B82F6';

  return L.divIcon({
    className: 'custom-hosp-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: ${bgColor}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.7);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
            <path d="M9 10h6"/>
            <path d="M12 7v6"/>
          </svg>
        </div>
        <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.9); color: ${isDiverted ? '#FCA5A5' : '#93C5FD'}; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; border: 1px solid #334155; white-space: nowrap; max-width: 90px; overflow: hidden; text-overflow: ellipsis;">
          ${hospital.name.split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [36, 54],
    iconAnchor: [18, 27],
  });
};

const createIncidentIcon = (incident) => {
  const esi = incident.triage?.esiLevel || 2;
  const color = esi === 1 ? '#EF4444' : esi === 2 ? '#F97316' : '#EAB308';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="position: relative;">
          <div style="position: absolute; width: 42px; height: 42px; top: -5px; left: -5px; background: ${color}; border-radius: 50%; opacity: 0.4; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 16px ${color};">
            <span style="color: white; font-weight: 900; font-size: 13px;">!</span>
          </div>
        </div>
        <div style="margin-top: 3px; background: #DC2626; color: white; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; white-space: nowrap;">
          ESI-${esi} ${incident.status}
        </div>
      </div>
    `,
    iconSize: [32, 50],
    iconAnchor: [16, 25],
  });
};

// Map Recenter Controller
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.panTo(center, { animate: true });
    }
  }, [center, map]);
  return null;
}

export const EmergencyMap = ({
  ambulances = [],
  hospitals = [],
  incidents = [],
  activeIncident = null,
  center = [12.9716, 77.5946], // Bangalore Metro Default
  zoom = 12,
  showTrafficOverlay = true,
  onSelectIncident,
  onSelectAmbulance,
}) => {
  const [mapLayer, setMapLayer] = useState('google_streets');

  // Extract active ambulance routes with live remaining distance & ETA calculations
  const activeRoutes = ambulances
    .filter((a) => a.activeRoute && a.activeRoute.length > 0)
    .map((a) => {
      let remainingKm = 0;
      const curIdx = a.routeProgressIndex || 0;
      for (let i = curIdx; i < a.activeRoute.length - 1; i++) {
        const p1 = a.activeRoute[i];
        const p2 = a.activeRoute[i + 1];
        const dLat = ((p2.latitude - p1.latitude) * Math.PI) / 180;
        const dLon = ((p2.longitude - p1.longitude) * Math.PI) / 180;
        const sa =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((p1.latitude * Math.PI) / 180) *
            Math.cos((p2.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        remainingKm += 6371 * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
      }
      const speed = a.location?.speedKmH || a.speedKmH || 48;
      const etaMin = Math.max(1, Math.round((remainingKm / speed) * 60));

      return {
        ambulanceId: a.id || a._id,
        callSign: a.callSign,
        coordinates: a.activeRoute.map((pt) => [pt.latitude, pt.longitude]),
        color: a.trafficDelayFactor > 1.05 ? '#F59E0B' : '#06B6D4',
        remainingKm: Math.max(0.3, Math.round(remainingKm * 10) / 10),
        etaMin,
        speed,
        status: a.status || 'En_Route',
      };
    });

  const primaryRoute = activeRoutes[0] || null;

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl z-0 isolate">
      
      {/* Floating Mission Navigation HUD (Distance & ETA) */}
      {primaryRoute && (
        <div className="absolute top-3 left-3 z-[400] bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-3 shadow-2xl backdrop-blur-md max-w-[260px] text-xs space-y-2 pointer-events-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-black text-white uppercase tracking-wider text-[10px]">
                Live Mission Route
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {primaryRoute.callSign}
            </span>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-slate-800/90 rounded-xl p-1.5 border border-slate-700">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Distance</div>
              <div className="text-sm font-black text-cyan-400">
                {primaryRoute.remainingKm} <span className="text-[9px] font-normal text-slate-400">km</span>
              </div>
            </div>
            <div className="bg-slate-800/90 rounded-xl p-1.5 border border-slate-700">
              <div className="text-[9px] text-slate-400 font-bold uppercase">ETA</div>
              <div className="text-sm font-black text-emerald-400">
                {primaryRoute.etaMin} <span className="text-[9px] font-normal text-slate-400">min</span>
              </div>
            </div>
            <div className="bg-slate-800/90 rounded-xl p-1.5 border border-slate-700">
              <div className="text-[9px] text-slate-400 font-bold uppercase">Speed</div>
              <div className="text-sm font-black text-amber-400">
                {primaryRoute.speed} <span className="text-[9px] font-normal text-slate-400">km/h</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[10px]">
              {primaryRoute.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Floating Google Maps Layer Switcher */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700 p-1 rounded-xl text-xs shadow-2xl flex items-center space-x-1">
        <button
          type="button"
          onClick={() => setMapLayer('google_streets')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
            mapLayer === 'google_streets'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🗺️ Google Maps
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('google_traffic')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
            mapLayer === 'google_traffic'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🚦 Google Traffic
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('google_satellite')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
            mapLayer === 'google_satellite'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🛰️ Satellite
        </button>
        <button
          type="button"
          onClick={() => setMapLayer('osm')}
          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
            mapLayer === 'osm'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          🌍 OSM
        </button>
      </div>

      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Real Google Maps / Traffic / Satellite / OSM Layer */}
        <TileLayer
          key={mapLayer}
          attribution={MAP_LAYERS[mapLayer].attribution}
          url={MAP_LAYERS[mapLayer].url}
          subdomains={MAP_LAYERS[mapLayer].subdomains || ['a', 'b', 'c']}
        />

        <MapRecenter center={center} />

        {/* Polylines for Active Dispatches (Google Maps Dual-Layer & Midpoint Badges) */}
        {activeRoutes.map((route, idx) => {
          const midCoord = route.coordinates[Math.floor(route.coordinates.length / 2)];
          return (
            <React.Fragment key={idx}>
              {/* Outer Casing Outline */}
              <Polyline
                positions={route.coordinates}
                pathOptions={{
                  color: '#020617',
                  weight: 9,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Core Glowing Line */}
              <Polyline
                positions={route.coordinates}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Distance & ETA Badge along Route */}
              {midCoord && (
                <Marker
                  position={midCoord}
                  icon={createDistanceBadgeIcon(route.remainingKm, route.etaMin)}
                  interactive={false}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Traffic Congestion Zones (Simulated City Corridors) */}
        {showTrafficOverlay && (
          <>
            <Circle
              center={[12.9620, 77.6080]}
              radius={700}
              pathOptions={{ color: '#EF4444', fillColor: '#EF4444', fillOpacity: 0.25, weight: 2 }}
            />
            <Circle
              center={[12.9880, 77.6250]}
              radius={600}
              pathOptions={{ color: '#F59E0B', fillColor: '#F59E0B', fillOpacity: 0.2, weight: 2 }}
            />
          </>
        )}

        {/* Hospitals Markers */}
        {hospitals.map((hosp) => {
          const lat = hosp.location?.latitude || hosp.latitude;
          const lon = hosp.location?.longitude || hosp.longitude;
          if (!lat || !lon) return null;

          return (
            <Marker
              key={hosp.id || hosp._id || hosp.name}
              position={[lat, lon]}
              icon={createHospitalIcon(hosp)}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                    <span className="font-bold text-sm text-slate-100">{hosp.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                      {hosp.type}
                    </span>
                  </div>
                  
                  {hosp.diversionStatus && (
                    <div className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-bold mb-2 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>ON DIVERSION (ICU/ER Saturated)</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
                      <div className="text-slate-400 text-[10px]">ER Beds Available</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {hosp.erBedsAvailable} / {hosp.erBedsTotal}
                      </div>
                    </div>
                    <div className="bg-slate-800/80 p-1.5 rounded border border-slate-700">
                      <div className="text-slate-400 text-[10px]">ICU Beds Available</div>
                      <div className={`text-sm font-bold ${hosp.icuBedsAvailable > 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                        {hosp.icuBedsAvailable} / {hosp.icuBedsTotal}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold text-slate-400">Facilities: </span>
                    {(hosp.activeFacilities || []).slice(0, 4).join(', ')}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulances Markers */}
        {ambulances.map((amb) => {
          const lat = amb.location?.latitude || amb.latitude;
          const lon = amb.location?.longitude || amb.longitude;
          if (!lat || !lon) return null;

          return (
            <Marker
              key={amb.id || amb._id || amb.callSign}
              position={[lat, lon]}
              icon={createAmbulanceIcon(amb)}
              eventHandlers={{
                click: () => onSelectAmbulance && onSelectAmbulance(amb),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[210px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                    <span className="font-bold text-sm text-slate-100">{amb.callSign}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      amb.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {amb.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 mb-2">
                    <div className="text-slate-300">
                      <span className="text-slate-400">Type:</span> <span className="font-semibold text-white">{amb.ambulanceType}</span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Lead Crew:</span> {amb.paramedicCrew?.leadParamedic || 'Paramedic Staff'}
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Certification:</span>{' '}
                      <span className="text-amber-400 font-semibold">{amb.paramedicCrew?.skillLevel || 'Advanced'}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-1.5">
                    <div className="text-[10px] text-slate-400 font-semibold mb-1">EQUIPMENT ONBOARD:</div>
                    <div className="flex flex-wrap gap-1">
                      {(amb.equipment || []).map((eq, i) => (
                        <span key={i} className="text-[9px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                          {eq.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Active Incidents Markers */}
        {incidents.map((inc) => {
          const lat = inc.location?.latitude;
          const lon = inc.location?.longitude;
          if (!lat || !lon) return null;

          return (
            <Marker
              key={inc.id || inc._id || inc.incidentCode}
              position={[lat, lon]}
              icon={createIncidentIcon(inc)}
              eventHandlers={{
                click: () => onSelectIncident && onSelectIncident(inc),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 mb-2">
                    <span className="font-bold text-sm text-red-400">{inc.incidentCode}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-black bg-red-600 text-white">
                      ESI {inc.triage?.esiLevel}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 mb-1">
                    {inc.chiefComplaint}
                  </div>

                  <div className="text-[11px] text-slate-400 mb-2">
                    {inc.location?.address}
                  </div>

                  <div className="bg-slate-800/80 p-2 rounded border border-slate-700 text-xs space-y-1">
                    <div className="text-slate-300">
                      <span className="text-slate-400">Assigned Unit:</span>{' '}
                      <span className="font-bold text-cyan-400">{inc.assignedAmbulance?.callSign || 'Pending'}</span>
                    </div>
                    <div className="text-slate-300">
                      <span className="text-slate-400">Target Hospital:</span>{' '}
                      <span className="font-bold text-blue-400">{inc.targetHospital?.name || 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[400] bg-slate-900/90 backdrop-blur border border-slate-700/80 p-2.5 rounded-lg text-xs shadow-xl space-y-1">
        <div className="font-bold text-slate-300 text-[11px] border-b border-slate-700 pb-1 mb-1">Map Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
          <span className="text-slate-300 text-[11px]">Emergency Incident (ESI 1-2)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block"></span>
          <span className="text-slate-300 text-[11px]">En Route Ambulance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          <span className="text-slate-300 text-[11px]">Available Ambulance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>
          <span className="text-slate-300 text-[11px]">Specialty Hospital</span>
        </div>
      </div>
    </div>
  );
};
