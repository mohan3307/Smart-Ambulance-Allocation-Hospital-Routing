import axios from 'axios';

const backendUrl = import.meta.env.VITE_API_URL || '';
const api = axios.create({
  baseURL: backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api',
  timeout: 10000,
});

// Attach Authorization Bearer token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aegis_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const EmergencyAPI = {
  // Incidents
  getIncidents: async () => (await api.get('/incidents')).data,
  getIncidentById: async (id) => (await api.get(`/incidents/${id}`)).data,
  createEmergency: async (incidentData) => (await api.post('/incidents', incidentData)).data,
  updateIncidentStatus: async (id, status, notes) => (await api.patch(`/incidents/${id}/status`, { status, notes })).data,
  toggleGreenCorridor: async (id) => (await api.post(`/incidents/${id}/green-corridor`)).data,
  autoDispatch: async (id) => (await api.post(`/incidents/${id}/auto-dispatch`)).data,

  // Ambulances
  getAmbulances: async () => (await api.get('/ambulances')).data,
  getAmbulanceById: async (id) => (await api.get(`/ambulances/${id}`)).data,
  simulateStep: async (id) => (await api.post(`/ambulances/${id}/step`)).data,
  triggerTrafficSpike: async (id) => (await api.post(`/ambulances/${id}/traffic-spike`)).data,

  // Hospitals
  getHospitals: async () => (await api.get('/hospitals')).data,
  getHospitalById: async (id) => (await api.get(`/hospitals/${id}`)).data,
  updateHospitalBeds: async (id, bedsData) => (await api.patch(`/hospitals/${id}/beds`, bedsData)).data,
  prepareBay: async (id, bayType, incidentCode) => (await api.post(`/hospitals/${id}/prepare-bay`, { bayType, incidentCode })).data,

  // System & Analytics
  getHealthAndStats: async () => (await api.get('/system/health-stats')).data,
  getAuditLogs: async () => (await api.get('/system/audits')).data,
  resetSystemData: async () => (await api.post('/system/reset')).data,
};

export const AuthAPI = {
  login: async (credentials) => (await api.post('/auth/login', credentials)).data,
  register: async (userData) => (await api.post('/auth/register', userData)).data,
  getMe: async () => (await api.get('/auth/me')).data,
  getDemoAccounts: async () => (await api.get('/auth/demo-accounts')).data,
};

