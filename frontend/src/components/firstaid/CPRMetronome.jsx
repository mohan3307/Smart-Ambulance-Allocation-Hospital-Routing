import React, { useState, useEffect, useRef } from 'react';
import { Heart, Volume2, VolumeX, Play, Pause, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

export const CPRMetronome = ({ etaMinutes = 5.2, isEmergencyActive = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [beatCount, setBeatCount] = useState(0);
  const [etaRemainingSeconds, setEtaRemainingSeconds] = useState(Math.round(etaMinutes * 60));
  const audioCtxRef = useRef(null);
  const timerRef = useRef(null);

  // Play audio tick sound using Web Audio API
  const playClick = () => {
    if (isMuted) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context may require initial user click
    }
  };

  // 110 BPM = 60 / 110 = 0.5454 seconds = 545.4 ms
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setBeatCount((prev) => prev + 1);
        playClick();
      }, 545);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, isMuted]);

  // ETA countdown timer
  useEffect(() => {
    const countdown = setInterval(() => {
      setEtaRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(countdown);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const toggleMetronome = () => {
    if (!isPlaying && !audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-gradient-to-b from-red-950/60 to-slate-900 border-2 border-red-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Synchronized ETA Banner */}
      <div className="flex items-center justify-between bg-red-900/40 border border-red-500/40 rounded-xl px-4 py-2.5 mb-5">
        <div className="flex items-center space-x-2.5">
          <Clock className="w-5 h-5 text-red-400 animate-pulse" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-red-300 font-bold">Ambulance ETA</div>
            <div className="text-xl font-black text-white font-mono">
              {etaRemainingSeconds > 0 ? formatTime(etaRemainingSeconds) : 'ARRIVING NOW!'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-500 text-white">
            ALS MICU En Route
          </span>
          <div className="text-[11px] text-red-300 font-medium mt-0.5">Stay with patient</div>
        </div>
      </div>

      {/* CPR Compression Rhythm Guide */}
      <div className="text-center my-4">
        <div className="inline-block relative">
          <div
            className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center mx-auto transition-transform ${
              isPlaying
                ? 'border-red-500 bg-red-600/20 animate-cpr-beat shadow-[0_0_35px_rgba(239,68,68,0.5)]'
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <Heart className={`w-12 h-12 ${isPlaying ? 'text-red-500 fill-red-500' : 'text-slate-500'}`} />
            <span className="text-xs font-black text-white mt-1">
              {isPlaying ? 'PUSH NOW' : '110 BPM'}
            </span>
          </div>
        </div>

        <div className="mt-3">
          <h3 className="text-lg font-black text-white">Hands-Only CPR Assistant</h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Push hard & fast in center of chest to the beat (100–120 compressions/min)
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-3 mb-5">
        <button
          onClick={toggleMetronome}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all ${
            isPlaying
              ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/40 animate-pulse'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'Pause Rhythm' : 'Start 110 BPM Beat'}</span>
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300"
          title={isMuted ? 'Unmute Audio Click' : 'Mute Audio Click'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>
      </div>

      {/* Step Checklist */}
      <div className="space-y-2 bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 text-xs">
        <div className="flex items-start space-x-2.5">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-[11px] border border-red-500/30">
            1
          </span>
          <span className="text-slate-200 font-medium">Place heel of one hand in center of chest, other hand interlaced on top.</span>
        </div>
        <div className="flex items-start space-x-2.5">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-[11px] border border-red-500/30">
            2
          </span>
          <span className="text-slate-200 font-medium">Lock elbows straight and compress at least 2 inches (5 cm) deep.</span>
        </div>
        <div className="flex items-start space-x-2.5">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold flex items-center justify-center text-[11px] border border-red-500/30">
            3
          </span>
          <span className="text-slate-200 font-medium">Allow full chest rise between each push. Do NOT stop until ambulance crew takes over!</span>
        </div>
      </div>
    </div>
  );
};
