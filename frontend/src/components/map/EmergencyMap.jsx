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
  const color = isAvailable ? '#10B981' : '#06B6D4'; // Green or Cyan
  const pulse = !isAvailable ? 'animation: pulse 1.5s infinite;' : '';

  return L.divIcon({
    className: 'custom-amb-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="background: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.6); ${pulse}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 14h-4v4h-6v-4H5v-6h4V4h6v4h4v6z"/>
          </svg>
        </div>
        <div style="margin-top: 2px; background: rgba(15, 23, 42, 0.9); color: white; font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; border: 1px solid #334155; white-space: nowrap;">
          ${ambulance.callSign.split(' ')[0]}
        </div>
      </div>
    `,
    iconSize: [34, 52],
    iconAnchor: [17, 26],
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

  // Extract active ambulance routes for polyline display
  const activeRoutes = ambulances
    .filter((a) => a.activeRoute && a.activeRoute.length > 0)
    .map((a) => ({
      ambulanceId: a.id || a._id,
      callSign: a.callSign,
      coordinates: a.activeRoute.map((pt) => [pt.latitude, pt.longitude]),
      color: a.trafficDelayFactor > 1.2 ? '#EF4444' : '#06B6D4',
    }));

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
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

        {/* Polylines for Active Dispatches */}
        {activeRoutes.map((route, idx) => (
          <Polyline
            key={idx}
            positions={route.coordinates}
            pathOptions={{
              color: route.color,
              weight: 5,
              opacity: 0.85,
              dashArray: '8, 8',
              lineCap: 'round',
            }}
          />
        ))}

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
