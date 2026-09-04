import React from 'react';
import { 
  Ambulance, 
  Hospital, 
  Activity, 
  AlertCircle, 
  ShieldAlert, 
  Compass, 
  Radio, 
  Cpu, 
  BarChart3,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const Navbar = ({ activeView, setActiveView, systemStats, activeIncidentCount = 0 }) => {
  const { connected } = useSocket();
  const isAiOptimized = systemStats?.system?.aiEngine === 'ai_optimized';

  const navItems = [
    { id: 'command', label: 'Command Dispatch', icon: Activity, badge: activeIncidentCount },
    { id: 'sos', label: 'Bystander SOS', icon: ShieldAlert, highlight: true },
    { id: 'hospital', label: 'Hospital ER Hub', icon: Hospital },
    { id: 'paramedic', label: 'Paramedic Tablet', icon: Compass },
    { id: 'analytics', label: 'XAI Audit & Stats', icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveView('command')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-500/20">
              <Ambulance className="w-6 h-6 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  AegisResponse
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  Golden Hour AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Smart Ambulance & Bed Allocation Platform</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : item.highlight
                      ? 'text-red-400 hover:bg-red-950/40 hover:text-red-300'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? (item.highlight ? 'text-red-400' : 'text-cyan-400') : ''}`} />
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Status Indicators */}
          <div className="flex items-center space-x-3">
            {/* AI Engine Status */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isAiOptimized
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-950/40 text-amber-400 border-amber-500/30'
            }`}>
              <Cpu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Engine:</span>
              <span className="font-semibold">{isAiOptimized ? 'AI-Optimized' : 'Rules Fallback'}</span>
            </div>

            {/* Socket Live Indicator */}
            <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
              {connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="hidden sm:inline text-slate-400">Live</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="hidden sm:inline text-rose-400">Offline</span>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};
