import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState(null);

  useEffect(() => {
    // Connect to WebSocket server
    const backendUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const s = io(backendUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    s.on('connect', () => {
      console.log('[Socket] Connected to server, ID:', s.id);
      setConnected(true);
      s.emit('join_room', 'dispatch_room');
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    });

    // Listen for alerts
    s.on('routing:reroute_alert', (data) => {
      setLastNotification({
        type: 'warning',
        title: 'Dynamic Reroute Triggered',
        message: `${data.callSign}: ${data.rerouteReason} (ETA adjusted to ${data.newEta}m)`,
        timestamp: new Date(),
      });
    });

    s.on('green_corridor:toggled', (data) => {
      setLastNotification({
        type: data.active ? 'success' : 'info',
        title: data.active ? 'Green Corridor Activated' : 'Green Corridor Deactivated',
        message: data.message,
        timestamp: new Date(),
      });
    });

    s.on('hospital:bay_prepared', (data) => {
      setLastNotification({
        type: 'info',
        title: 'Emergency Bay Ready',
        message: `${data.hospitalName} confirmed ${data.bayType} reserved for ${data.incidentCode}`,
        timestamp: new Date(),
      });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const clearNotification = () => setLastNotification(null);

  // Helper actions for bidirectional real-time communication
  const joinRole = (role, id = null) => {
    if (socket && socket.connected) {
      socket.emit('join_role', { role, id });
    }
  };

  const streamAmbulanceLocation = (locationData) => {
    if (socket && socket.connected) {
      socket.emit('ambulance:update_location', locationData);
    }
  };

  const updateHospitalBedsLive = (bedData) => {
    if (socket && socket.connected) {
      socket.emit('hospital:update_beds', bedData);
    }
  };

  const updateAmbulanceStatusLive = (statusData) => {
    if (socket && socket.connected) {
      socket.emit('ambulance:update_status', statusData);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        lastNotification,
        clearNotification,
        joinRole,
        streamAmbulanceLocation,
        updateHospitalBedsLive,
        updateAmbulanceStatusLive,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
