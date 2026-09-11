import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthAPI } from '../services/api.js';
import { useSocket } from './SocketContext.jsx';

const AuthContext = createContext(null);

const DEFAULT_DISPATCHER = {
  id: 'user-dispatcher-1',
  name: 'Chief Dispatcher Vance',
  email: 'dispatcher@aegis.gov',
  role: 'dispatcher',
  assignedEntityId: null,
  assignedEntityName: 'Chennai Emergency Command Hub',
  badgeNumber: 'CAD-911',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aegis_user');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_DISPATCHER;
    } catch {
      return DEFAULT_DISPATCHER;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('aegis_token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const socketContext = useSocket();

  // Keep socket room aligned with the active role
  useEffect(() => {
    if (user && socketContext?.joinRole) {
      socketContext.joinRole(user.role, user.assignedEntityId);
    }
  }, [user, socketContext?.connected]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthAPI.login({ email, password });
      if (res.success && res.token) {
        setToken(res.token);
        setUser(res.user);
        localStorage.setItem('aegis_token', res.token);
        localStorage.setItem('aegis_user', JSON.stringify(res.user));
        return { success: true, user: res.user };
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('aegis_token');
    localStorage.removeItem('aegis_user');
    setToken('');
    setUser(DEFAULT_DISPATCHER);
  };

  const switchRole = async (targetRole) => {
    let email = 'dispatcher@aegis.gov';
    if (targetRole === 'ambulance_driver') email = 'driver@aegis.gov';
    else if (targetRole === 'hospital_staff') email = 'apollo.er@aegis.gov';
    else if (targetRole === 'admin') email = 'admin@aegis.gov';

    try {
      const result = await login(email, 'password123');
      if (result.success) return result;
    } catch (err) {
      console.warn('[AuthContext] Quick role switch fallback to mock profile:', err);
    }

    // Direct profile swap if backend auth is unreachable
    let fallbackProfile = DEFAULT_DISPATCHER;
    if (targetRole === 'ambulance_driver') {
      fallbackProfile = {
        id: 'user-driver-1',
        name: 'Paramedic Alex Chen',
        email: 'driver@aegis.gov',
        role: 'ambulance_driver',
        assignedEntityId: 'AMB-01',
        assignedEntityName: 'Apollo Unit Alpha (AMB-01)',
        badgeNumber: 'EMT-402',
      };
    } else if (targetRole === 'hospital_staff') {
      fallbackProfile = {
        id: 'user-er-1',
        name: 'Dr. Rajesh Sharma',
        email: 'apollo.er@aegis.gov',
        role: 'hospital_staff',
        assignedEntityId: 'HOSP-01',
        assignedEntityName: 'Apollo Main Hospital, Greams Road',
        badgeNumber: 'MED-771',
      };
    } else if (targetRole === 'admin') {
      fallbackProfile = {
        id: 'user-admin-1',
        name: 'System Administrator',
        email: 'admin@aegis.gov',
        role: 'admin',
        assignedEntityId: null,
        assignedEntityName: 'Aegis Core Platform Ops',
        badgeNumber: 'ADM-001',
      };
    }

    setUser(fallbackProfile);
    localStorage.setItem('aegis_user', JSON.stringify(fallbackProfile));
    return { success: true, user: fallbackProfile };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'dispatcher',
        token,
        isAuthenticated: !!token,
        loading,
        error,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
