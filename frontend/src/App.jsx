import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { CommandDashboard } from './pages/CommandDashboard';
import { BystanderSOS } from './pages/BystanderSOS';
import { HospitalERView } from './pages/HospitalERView';
import { ParamedicView } from './pages/ParamedicView';
import { AnalyticsAudit } from './pages/AnalyticsAudit';
import { EmergencyAPI } from './services/api';

function AppLayout() {
  const [activeView, setActiveView] = useState('command'); // 'command' | 'sos' | 'hospital' | 'paramedic' | 'analytics'
  const [systemStats, setSystemStats] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const { socket } = useSocket();
  const { role } = useAuth();

  const refreshSystem = async () => {
    try {
      const [statsRes, incRes] = await Promise.all([
        EmergencyAPI.getHealthAndStats(),
        EmergencyAPI.getIncidents(),
      ]);
      setSystemStats(statsRes);
      setIncidents(incRes.data || []);
    } catch (e) {
      // Background retry
    }
  };

  // Initial load
  useEffect(() => {
    refreshSystem();
  }, []);

  // Replace periodic polling with real-time WebSocket events
  useEffect(() => {
    if (!socket) return;

    const handleSystemUpdate = () => {
      refreshSystem();
    };

    socket.on('incident:created', handleSystemUpdate);
    socket.on('incident:status_changed', handleSystemUpdate);
    socket.on('ambulance:dispatched', handleSystemUpdate);
    socket.on('ambulance:status_updated', handleSystemUpdate);
    socket.on('hospital:bed_updated', handleSystemUpdate);
    socket.on('system:reset', handleSystemUpdate);

    return () => {
      socket.off('incident:created', handleSystemUpdate);
      socket.off('incident:status_changed', handleSystemUpdate);
      socket.off('ambulance:dispatched', handleSystemUpdate);
      socket.off('ambulance:status_updated', handleSystemUpdate);
      socket.off('hospital:bed_updated', handleSystemUpdate);
      socket.off('system:reset', handleSystemUpdate);
    };
  }, [socket]);

  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      {/* Main Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        systemStats={systemStats}
        activeIncidentCount={activeIncidents.length}
      />

      {/* View Content */}
      <main className="flex-1">
        {activeView === 'command' && (
          <CommandDashboard onOpenSOS={() => setActiveView('sos')} />
        )}
        {activeView === 'sos' && <BystanderSOS />}
        {activeView === 'hospital' && <HospitalERView />}
        {activeView === 'paramedic' && <ParamedicView />}
        {activeView === 'analytics' && <AnalyticsAudit />}
      </main>

      {/* Platform Footer */}
      <footer className="bg-slate-900/60 border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-400">AegisResponse Platform</span> &bull; AI-Powered Emergency Management & Hospital Bed Optimization
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>Manchester Triage & ESI Protocols</span>
            <span>&bull;</span>
            <span>Explainable AI (XAI) Enabled</span>
            <span>&bull;</span>
            <span>Dynamic Rerouting Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </SocketProvider>
  );
}

export default App;
